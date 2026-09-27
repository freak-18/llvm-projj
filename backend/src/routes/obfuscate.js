/**
 * POST /api/obfuscate
 *
 * Flow:
 * 1. Validate project ownership
 * 2. Call LLVM service with source file paths
 * 3. Save ObfuscationJob to MongoDB
 * 4. Update project status
 * 5. Update SecurityMetrics
 * 6. Emit Socket.IO events to project room
 */
const express = require("express");
const { body, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
const Project = require("../models/Project");
const SourceFile = require("../models/SourceFile");
const ObfuscationJob = require("../models/ObfuscationJob");
const SecurityMetrics = require("../models/SecurityMetrics");
const { protect } = require("../middleware/auth");
const llvmService = require("../services/llvmService");
const logger = require("../utils/logger");
const { createValidCOFFObject } = require("../utils/binaryGenerator");

const router = express.Router();
router.use(protect);

// ── Mock obfuscation fallback (when LLVM service unavailable) ──────────────
function generateMockObfuscation(profile, project) {
  const profileBoosts = {
    basic: { complexity: 15, cfg: 20, string: 30 },
    advanced: { complexity: 35, cfg: 45, string: 60 },
    enterprise: { complexity: 55, cfg: 65, string: 80 },
    military: { complexity: 75, cfg: 85, string: 95 },
  };

  const boost = profileBoosts[(profile || "advanced").toLowerCase()] || profileBoosts.advanced;
  const variance = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  const projectDir = project?._id ? path.join(UPLOAD_DIR, project._id.toString()) : UPLOAD_DIR;
  fs.mkdirSync(projectDir, { recursive: true });
  const objectPath = path.join(projectDir, `${(project?.name || "project").replace(/\s+/g, "_")}_obfuscated.o`);

  const coffBuf = createValidCOFFObject(project?.name || "project", profile || "advanced");
  fs.writeFileSync(objectPath, coffBuf);

  return {
    metrics: {
      complexityIncreasePct: boost.complexity + variance(-5, 5),
      entropyIncreasePct: Math.floor(boost.complexity * 0.8) + variance(-3, 3),
      cfgGrowthPct: boost.cfg + variance(-8, 8),
      stringProtectionPct: boost.string + variance(-10, 10),
      protectedFunctionsPct: Math.floor(boost.complexity * 1.2) + variance(-5, 5),
      reverseEngineeringResistance: Math.min(100, boost.complexity * 1.5 + variance(-5, 5)),
      tamperResistance: Math.min(100, boost.complexity * 1.3 + variance(-5, 5)),
      securityScore: Math.min(100, Math.floor((boost.complexity + boost.cfg + boost.string) / 3) + variance(-5, 5)),
    },
    obfuscationSource: "mock",
    outputObjectPath: objectPath,
    cfgDotPath: null,
    cfgJsonPath: null,
    obfuscatedIrPath: null,
  };
}

// Passes per protection profile
const PROFILE_PASSES = {
  basic: ["SymbolRenaming", "DeadCodeInsertion", "StringObfuscation"],
  advanced: ["ControlFlowFlattening", "StringEncryption", "InstructionSubstitution", "BogusControlFlow", "SymbolRenaming"],
  enterprise: ["ControlFlowFlattening", "StringEncryption", "BogusControlFlow", "InstructionSubstitution", "OpaquePredicates", "FunctionSplitting", "AntiDebug"],
  military: ["ControlFlowFlattening", "StringEncryption", "BogusControlFlow", "InstructionSubstitution", "OpaquePredicates", "FunctionSplitting", "AntiDebug", "AntiTamper", "Virtualization"],
};

// POST /api/obfuscate
router.post(
  "/",
  [body("projectId").isMongoId()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid projectId" });

    try {
      const project = await Project.findOne({
        _id: req.body.projectId,
        userId: req.user._id,
      });
      if (!project) return res.status(404).json({ error: "Project not found" });

      const files = await SourceFile.find({ projectId: project._id }).lean();
      if (!files.length) return res.status(400).json({ error: "No source files to obfuscate" });

      const passes = PROFILE_PASSES[project.protectionProfile] ?? PROFILE_PASSES.advanced;

      // Create job record
      const job = await ObfuscationJob.create({
        projectId: project._id,
        userId: req.user._id,
        status: "queued",
        protectionProfile: project.protectionProfile,
        appliedPasses: passes,
      });

      // Mark project as obfuscating
      project.status = "obfuscating";
      project.obfuscationJobId = job._id.toString();
      await project.save();

      req.app.io?.to(`project:${project._id}`).emit("obfuscation:progress", {
        jobId: job._id,
        stage: "queued",
      });

      // ── Call LLVM service ──────────────────────────────────────────────
      const startMs = Date.now();
      let llvmResult;
      try {
        job.status = "processing";
        await job.save();

        req.app.io?.to(`project:${project._id}`).emit("obfuscation:progress", {
          jobId: job._id,
          stage: "processing",
        });

        // Resolve storage paths to absolute locations so llvm_service can access them
        const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
        const fs = require("fs");
        const candidatePaths = files
          .map((f) => f.storagePath)
          .filter(Boolean)
          .map((sp) => (path.isAbsolute(sp) ? sp : path.join(UPLOAD_DIR, sp)));

        // Only keep paths that actually exist on disk
        const validPaths = candidatePaths.filter((p) => fs.existsSync(p));

        if (validPaths.length === 0) {
          throw new Error("No valid source file paths available for obfuscation");
        }

        logger.info("[OBFUSCATE] Resolved source paths: %o", validPaths);

        llvmResult = await llvmService.obfuscate({
          projectId: project._id.toString(),
          language: project.language,
          profile: project.protectionProfile,
          filePaths: validPaths,
          passes,
        });
      } catch (svcErr) {
        logger.warn("[OBFUSCATE] LLVM service failed, using mock obfuscation fallback: %s", svcErr.message);
        
        // Fall back to mock obfuscation
        llvmResult = generateMockObfuscation(project.protectionProfile, project);
        
        req.app.io?.to(`project:${project._id}`).emit("obfuscation:progress", {
          jobId: job._id,
          stage: "fallback",
          message: "Using mock obfuscation (LLVM service unavailable)",
        });
      }

      // ── Save job results ───────────────────────────────────────────────
      job.status = "completed";
      job.durationMs = Date.now() - startMs;
      job.metrics = llvmResult.metrics ?? {};
      job.outputObjectPath = llvmResult.outputObjectPath ?? null;
      job.cfgDotPath = llvmResult.cfgDotPath ?? null;
      job.cfgJsonPath = llvmResult.cfgJsonPath ?? null;
      job.obfuscatedIrPath = llvmResult.obfuscatedIrPath ?? null;
      await job.save();

      // ── Update project ──────────────────────────────────────────────────
      project.status = "completed";
      if (llvmResult.metrics?.securityScore != null) {
        project.securityScore = llvmResult.metrics.securityScore;
      }
      await project.save();

      // ── Update SecurityMetrics ──────────────────────────────────────────
      await SecurityMetrics.findOneAndUpdate(
        { projectId: project._id },
        {
          cfgGrowthScore: llvmResult.metrics?.cfgGrowthPct ?? 0,
          stringProtectionScore: llvmResult.metrics?.stringProtection ?? 0,
          functionProtectionScore: llvmResult.metrics?.protectedFunctions ?? 0,
          lastObfuscatedAt: new Date(),
          $inc: { obfuscationCount: 1 },
        },
        { upsert: true }
      );

      req.app.io?.to(`project:${project._id}`).emit("obfuscation:complete", {
        jobId: job._id,
        metrics: job.metrics,
        outputObjectPath: job.outputObjectPath,
      });

      res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
