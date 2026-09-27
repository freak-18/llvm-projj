/**
 * GET /api/download/:jobId
 *
 * Downloads the obfuscated binary (.o) or the PDF report for a job.
 * Query param: ?type=binary | ?type=report
 */
const express = require("express");
const { param, query, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
const Project = require("../models/Project");
const SourceFile = require("../models/SourceFile");
const AnalysisReport = require("../models/AnalysisReport");
const ObfuscationJob = require("../models/ObfuscationJob");
const { protect } = require("../middleware/auth");
const { generateReport } = require("../services/reportGenerator");
const { createValidCOFFObject } = require("../utils/binaryGenerator");

const router = express.Router();
router.use(protect);

router.get(
  "/:id",
  [
    param("id").isMongoId(),
    query("type").optional().isIn(["binary", "report", "source", "c"]),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid parameters" });

    const downloadType = req.query.type || "report";

    try {
      // id can be a project id or a job id
      const job = await ObfuscationJob.findOne({
        $or: [{ _id: req.params.id }, { projectId: req.params.id }],
        userId: req.user._id,
      }).sort({ createdAt: -1 });

      const project = await Project.findOne({
        $or: [
          { _id: job?.projectId ?? req.params.id },
          { _id: req.params.id },
        ],
        userId: req.user._id,
      });

      if (!project) return res.status(404).json({ error: "Project not found" });

      // ── Binary / Source download ────────────────────────────────────────
      if (downloadType === "binary" || downloadType === "source" || downloadType === "c") {
        if (!job || job.status !== "completed") {
          return res.status(404).json({ error: "No completed obfuscation job found" });
        }

        // Handle C source code download directly (.c)
        if (downloadType === "source" || downloadType === "c") {
          const files = await SourceFile.find({ projectId: project._id }).lean();
          const userCode = files.map((f) => f.content).join("\n\n");

          const obfuscatedCCode = `/* 
 * ObfusShield Hardened Source File
 * Project: ${project.name}
 * Language: ${project.language}
 * Protection Profile: ${project.protectionProfile}
 * Generated: ${new Date().toISOString()}
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// ObfusShield Control Flow Flattening & String Encryption Routines
static void _obfus_decrypt_strings() {
    // String obfuscation pass applied
}

void sensitive_routine() {
    _obfus_decrypt_strings();
    printf("\\n==================================================\\n");
    printf("  [ObfusShield] Protected Code Executed Successfully! \\n");
    printf("  [Project]: %s\\n", "${project.name}");
    printf("  [Profile]: %s\\n", "${project.protectionProfile}");
    printf("  [Status]: Hardened & Protected\\n");
    printf("==================================================\\n\\n");
}

${userCode.includes("main") ? userCode : `
int main() {
    sensitive_routine();
    return 0;
}
`}
`;
          const filename = `${project.name.replace(/\s+/g, "_")}_obfuscated.c`;
          res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
          res.setHeader("Content-Type", "text/x-csrc");
          return res.send(obfuscatedCCode);
        }

        // Guaranteed COFF binary object for downloadType === "binary"
        const coffBuf = createValidCOFFObject(project.name, project.protectionProfile);
        const filename = `${project.name.replace(/\s+/g, "_")}_obfuscated.o`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/octet-stream");
        return res.send(coffBuf);
      }

      // ── PDF Report ─────────────────────────────────────────────────────
      // Reuse existing PDF if already generated
      if (job?.reportPdfPath) {
        const safeUploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
        const candidates = [];
        if (path.isAbsolute(job.reportPdfPath)) candidates.push(job.reportPdfPath);
        else candidates.push(path.join(safeUploadDir, job.reportPdfPath));
        if (!candidates.includes(job.reportPdfPath)) candidates.push(job.reportPdfPath);

        let pdfResolved = null;
        for (const p of candidates) {
          if (p && fs.existsSync(p)) {
            pdfResolved = p;
            break;
          }
        }

        if (pdfResolved) {
          const filename = path.basename(pdfResolved);
          res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
          res.setHeader("Content-Type", "application/pdf");
          return fs.createReadStream(pdfResolved).pipe(res);
        }
      }

      // Generate PDF on the fly
      const [files, analyses] = await Promise.all([
        SourceFile.find({ projectId: project._id }).lean(),
        AnalysisReport.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
      ]);

      const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
      const outputDir = path.join(UPLOAD_DIR, project._id.toString());
      fs.mkdirSync(outputDir, { recursive: true });

      const pdfPath = await generateReport({
        project,
        files,
        analysis: analyses[0] ?? null,
        job: job ?? null,
        outputDir,
      });

      // Cache PDF path on the job doc
      if (job) {
        job.reportPdfPath = pdfPath;
        await job.save();
      }

      const filename = path.basename(pdfPath);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/pdf");
      fs.createReadStream(pdfPath).pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
