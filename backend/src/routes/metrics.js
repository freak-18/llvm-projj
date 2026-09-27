/**
 * GET /api/metrics/:projectId
 * Returns aggregated SecurityMetrics for a project.
 * If the latest job has no cfgJson (old job), generates one on-the-fly.
 */
const express = require("express");
const { param, validationResult } = require("express-validator");
const SecurityMetrics = require("../models/SecurityMetrics");
const AnalysisReport = require("../models/AnalysisReport");
const ObfuscationJob = require("../models/ObfuscationJob");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// ── Inline CFG generator (mirrors obfuscate.js generateMockCFG) ────────────
function generateMockCFG(profile) {
  const profilePasses = {
    basic:      ["SymbolRenaming", "DeadCode", "StringObf"],
    advanced:   ["CFF", "StringEnc", "InstSub", "BogousCF", "SymRename"],
    enterprise: ["CFF", "StringEnc", "BogousCF", "InstSub", "Opaques", "FuncSplit", "AntiDbg"],
    military:   ["CFF", "StringEnc", "BogousCF", "InstSub", "Opaques", "FuncSplit", "AntiDbg", "AntiTamper", "Virt"],
  };
  const passes = profilePasses[(profile || "advanced").toLowerCase()] ?? profilePasses.advanced;

  const nodes = [
    { id: "entry",      data: { label: "entry:\nAlloca / Args" } },
    { id: "obfus_init", data: { label: "obfus_init:\n_obfus_key = 0x1337" } },
  ];

  passes.forEach((p, i) => {
    nodes.push({ id: `pass_${i}`, data: { label: `${p}:\n%bb${i} = phi i32` } });
  });

  nodes.push({ id: "dispatcher", data: { label: "switch.dispatch:\nswitch i32 %state" } });

  const blockCount = Math.min(passes.length + 2, 8);
  for (let i = 0; i < blockCount; i++) {
    nodes.push({ id: `bb${i}`, data: { label: `bb${i}:\n%r${i} = xor i32 %a, %b\nbr label %merge` } });
  }

  nodes.push({ id: "merge", data: { label: "merge:\n%phi = phi i32" } });
  nodes.push({ id: "exit",  data: { label: "exit:\nret i32 0" } });

  const edges = [];
  let edgeId = 0;

  edges.push({ id: `e${edgeId++}`, source: "entry",      target: "obfus_init" });
  edges.push({ id: `e${edgeId++}`, source: "obfus_init", target: passes.length ? "pass_0" : "dispatcher" });

  passes.forEach((_, i) => {
    const next = i + 1 < passes.length ? `pass_${i + 1}` : "dispatcher";
    edges.push({ id: `e${edgeId++}`, source: `pass_${i}`, target: next });
  });

  for (let i = 0; i < blockCount; i++) {
    edges.push({ id: `e${edgeId++}`, source: "dispatcher", target: `bb${i}` });
  }

  for (let i = 0; i < blockCount; i++) {
    edges.push({ id: `e${edgeId++}`, source: `bb${i}`, target: "merge" });
  }

  edges.push({ id: `e${edgeId++}`, source: "merge",      target: "exit" });
  edges.push({ id: `e${edgeId++}`, source: "merge",      target: "dispatcher", label: "[opaque=false]" });

  return { nodes, edges };
}

router.get(
  "/:projectId",
  [param("projectId").isMongoId()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid projectId" });

    try {
      const [metrics, latestAnalysis, latestJob] = await Promise.all([
        SecurityMetrics.findOne({ projectId: req.params.projectId, userId: req.user._id }).lean(),
        AnalysisReport.findOne({ projectId: req.params.projectId, userId: req.user._id })
          .sort({ createdAt: -1 })
          .lean(),
        ObfuscationJob.findOne({
          projectId: req.params.projectId,
          userId: req.user._id,
          status: "completed",
        })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      if (!metrics) return res.status(404).json({ error: "Metrics not found" });

      // ── Backfill cfgJson for old jobs that pre-date the cfgJson field ─────
      if (latestJob && !latestJob.cfgJson) {
        const cfg = generateMockCFG(latestJob.protectionProfile || "advanced");

        // Persist to DB so next request is instant
        await ObfuscationJob.findByIdAndUpdate(latestJob._id, { cfgJson: cfg });

        latestJob.cfgJson = cfg;
      }

      res.json({ metrics, latestAnalysis, latestJob });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
