/**
 * POST /api/upload
 *
 * Multipart file upload endpoint — alternative to embedding file content
 * in JSON. Useful for large binaries or when the React frontend uses
 * FormData instead of base64-in-JSON.
 *
 * Requires projectId in the form body (the project must already exist).
 */
const express = require("express");
const path = require("path");
const Project = require("../models/Project");
const SourceFile = require("../models/SourceFile");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(protect);

router.post("/", upload.array("files", 20), async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user._id,
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const uploadedFiles = req.files;
    if (!uploadedFiles?.length) return res.status(400).json({ error: "No files uploaded" });

    const rows = uploadedFiles.map((f) => ({
      projectId: project._id,
      userId: req.user._id,
      filename: f.originalname,
      content: require("fs").readFileSync(f.path, "utf8"),
      sizeBytes: f.size,
      language: project.language,
      storagePath: f.path,
    }));

    const saved = await SourceFile.insertMany(rows);
    res.status(201).json({ uploaded: saved.length, files: saved.map((f) => ({ id: f._id, filename: f.filename })) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
