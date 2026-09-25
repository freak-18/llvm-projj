const express = require("express");
const { body, param, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
const Project = require("../models/Project");
const SourceFile = require("../models/SourceFile");
const AnalysisReport = require("../models/AnalysisReport");
const ObfuscationJob = require("../models/ObfuscationJob");
const SecurityMetrics = require("../models/SecurityMetrics");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// ─── POST /api/project/create ──────────────────────────────────────────────
router.post(
  "/create",
  [
    body("name").trim().isLength({ min: 1, max: 120 }),
    body("description").optional().trim().isLength({ max: 2000 }),
    body("language").isIn(["c", "c++", "rust", "go"]),
    body("protectionProfile").isIn(["basic", "advanced", "enterprise", "military"]),
    body("files").isArray({ min: 1, max: 20 }),
    body("files.*.filename").trim().isLength({ min: 1, max: 200 }),
    body("files.*.content").isString().notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }

    let proj = null;
    try {
      const { name, description, language, protectionProfile, files } = req.body;

      // Validate user is authenticated
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Create project (no transaction — Atlas M0 free tier doesn't support them)
      proj = await Project.create({
        userId: req.user._id,
        name,
        description: description ?? null,
        language,
        protectionProfile,
        status: "uploaded",
      });

      // Write source files to disk and DB
      const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
      const projDir = path.join(UPLOAD_DIR, proj._id.toString());
      fs.mkdirSync(projDir, { recursive: true });

      const fileRows = files.map((f) => {
        const safeName = path.basename(f.filename).replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = path.join(projDir, safeName);
        fs.writeFileSync(storagePath, f.content, "utf8");
        return {
          projectId: proj._id,
          userId: req.user._id,
          filename: f.filename,
          content: f.content,
          sizeBytes: Buffer.byteLength(f.content, "utf8"),
          language,
          storagePath,
        };
      });

      await SourceFile.insertMany(fileRows);

      // Initialise security metrics row
      await SecurityMetrics.create({ projectId: proj._id, userId: req.user._id });

      res.status(201).json({ 
        id: proj._id.toString(), 
        name: proj.name, 
        status: proj.status 
      });
    } catch (err) {
      // Clean up the project document if file insertion failed
      if (proj?._id) {
        await Project.deleteOne({ _id: proj._id }).catch(() => {});
      }
      next(err);
    }
  }
);

// ─── GET /api/project/list ─────────────────────────────────────────────────
router.get("/list", async (req, res, next) => {
  try {
    const projects = await Project.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/project/:id ──────────────────────────────────────────────────
router.get(
  "/:id",
  [param("id").isMongoId()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid project id" });

    try {
      const project = await Project.findOne({
        _id: req.params.id,
        userId: req.user._id,
      }).lean();
      if (!project) return res.status(404).json({ error: "Project not found" });

      const [files, analyses, metrics, jobs] = await Promise.all([
        SourceFile.find({ projectId: project._id }).select("-content").lean(),
        AnalysisReport.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
        SecurityMetrics.findOne({ projectId: project._id }).lean(),
        ObfuscationJob.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
      ]);

      res.json({ project, files, analyses, metrics, jobs });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/project/:id ───────────────────────────────────────────────
router.delete(
  "/:id",
  [param("id").isMongoId()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid project id" });

    try {
      const project = await Project.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id,
      });
      if (!project) return res.status(404).json({ error: "Project not found" });

      // Cascade delete related documents
      await Promise.all([
        SourceFile.deleteMany({ projectId: project._id }),
        AnalysisReport.deleteMany({ projectId: project._id }),
        ObfuscationJob.deleteMany({ projectId: project._id }),
        SecurityMetrics.deleteOne({ projectId: project._id }),
      ]);

      // Remove uploaded files from disk
      const projDir = path.join(process.env.UPLOAD_DIR || "./uploads", project._id.toString());
      if (fs.existsSync(projDir)) {
        fs.rmSync(projDir, { recursive: true, force: true });
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
