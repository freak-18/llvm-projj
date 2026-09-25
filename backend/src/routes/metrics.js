/**
 * GET /api/metrics/:projectId
 * Returns aggregated SecurityMetrics for a project.
 */
const express = require("express");
const { param, validationResult } = require("express-validator");
const SecurityMetrics = require("../models/SecurityMetrics");
const AnalysisReport = require("../models/AnalysisReport");
const ObfuscationJob = require("../models/ObfuscationJob");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

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

      res.json({ metrics, latestAnalysis, latestJob });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
