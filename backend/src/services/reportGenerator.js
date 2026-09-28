/**
 * PDF Report Generator using PDFKit.
 *
 * Generates a professional security report with:
 *  - Executive Summary
 *  - Risk Analysis
 *  - Applied Passes
 *  - Security Metrics
 *  - Sensitive Function Table
 *  - Security Score
 */
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

const BRAND_BLUE = "#6366F1";
const BRAND_PURPLE = "#8B5CF6";
const TEXT_DARK = "#1E1B2E";
const TEXT_MUTED = "#6B7280";
const BG_LIGHT = "#F8F7FF";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const GREEN = "#10B981";

/**
 * Generate PDF report and save to disk.
 *
 * @param {Object} opts
 * @param {Object} opts.project
 * @param {Array}  opts.files
 * @param {Object} opts.analysis   - AnalysisReport doc
 * @param {Object} opts.job        - ObfuscationJob doc (optional)
 * @param {string} opts.outputDir  - directory to write the PDF
 * @returns {string} absolute path to the generated PDF
 */
async function generateReport({ project, files, analysis, job, outputDir }) {
  const filename = `${project.name.replace(/\s+/g, "_")}_security_report_${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ── Cover Page ─────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 200)
      .fill(TEXT_DARK);

    doc
      .fillColor("#FFFFFF")
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("ObfusShield AI", 50, 60)
      .fontSize(14)
      .font("Helvetica")
      .text("Security Analysis Report", 50, 100)
      .fontSize(11)
      .fillColor("#A5B4FC")
      .text(`Generated: ${new Date().toUTCString()}`, 50, 130);

    // Score badge
    const score = analysis?.metrics?.securityScore ?? project.securityScore ?? 0;
    const scoreColor = score >= 80 ? GREEN : score >= 60 ? AMBER : RED;
    doc
      .circle(doc.page.width - 80, 100, 40)
      .fill(scoreColor)
      .fillColor("#FFFFFF")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(score.toString(), doc.page.width - 98, 87, { width: 40, align: "center" })
      .fontSize(9)
      .text("/100", doc.page.width - 98, 114, { width: 40, align: "center" });

    doc.moveDown(8);

    // ── Project Details ────────────────────────────────────────────────────
    section(doc, "Project Details");
    labelValue(doc, "Name", project.name);
    labelValue(doc, "Language", project.language?.toUpperCase());
    labelValue(doc, "Protection Profile", project.protectionProfile?.toUpperCase());
    labelValue(doc, "Status", project.status);
    labelValue(doc, "Created", new Date(project.createdAt).toLocaleDateString());
    doc.moveDown();

    // ── Source Files ───────────────────────────────────────────────────────
    section(doc, "Source Files");
    files.forEach((f) => {
      doc
        .fillColor(TEXT_DARK)
        .fontSize(10)
        .font("Courier")
        .text(`• ${f.filename}  (${f.sizeBytes} B)`, { indent: 10 });
    });
    doc.moveDown();

    // ── Executive Summary ──────────────────────────────────────────────────
    if (analysis?.summary) {
      section(doc, "Executive Summary");
      doc
        .fillColor(TEXT_DARK)
        .fontSize(11)
        .font("Helvetica")
        .text(analysis.summary, { align: "justify" });
      doc.moveDown();
    }

    // ── Overall Risk ───────────────────────────────────────────────────────
    if (analysis?.overallRisk) {
      const riskColor = {
        low: GREEN, medium: AMBER, high: "#F97316", critical: RED,
      }[analysis.overallRisk] || AMBER;

      doc
        .roundedRect(50, doc.y, 160, 36, 6)
        .fill(riskColor)
        .fillColor("#FFFFFF")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(`Overall Risk: ${analysis.overallRisk.toUpperCase()}`, 58, doc.y - 28);

      doc.moveDown(2);
    }

    // ── Security Metrics ──────────────────────────────────────────────────
    if (analysis?.metrics) {
      section(doc, "Security Metrics");
      const m = analysis.metrics;
      const metricRows = [
        ["Security Score", m.securityScore ?? "—"],
        ["RE Resistance", m.reverseEngineeringResistance != null ? `${m.reverseEngineeringResistance}%` : "—"],
        ["Tamper Resistance", m.tamperResistance != null ? `${m.tamperResistance}%` : "—"],
        ["Protection Coverage", m.protectionCoverage != null ? `${m.protectionCoverage}%` : "—"],
        ["Complexity Increase", m.complexityIncreasePct != null ? `+${m.complexityIncreasePct}%` : "—"],
        ["Entropy Increase", m.entropyIncreasePct != null ? `+${m.entropyIncreasePct}%` : "—"],
      ];
      metricsTable(doc, metricRows);
      doc.moveDown();
    }

    // ── Obfuscation Job Metrics ────────────────────────────────────────────
    if (job?.metrics) {
      section(doc, "LLVM Obfuscation Metrics");
      const m = job.metrics;
      const rows = [
        ["CFG Growth", m.cfgGrowthPct != null ? `+${m.cfgGrowthPct}%` : "—"],
        ["String Protection", m.stringProtection != null ? `${m.stringProtection}%` : "—"],
        ["Functions Protected", m.protectedFunctions != null ? `${m.protectedFunctions}%` : "—"],
        ["Obfuscation Duration", job.durationMs != null ? `${job.durationMs} ms` : "—"],
      ];
      if (job.appliedPasses?.length) {
        rows.push(["Applied Passes", job.appliedPasses.join(", ")]);
      }
      metricsTable(doc, rows);
      doc.moveDown();
    }

    // ── Sensitive Functions ────────────────────────────────────────────────
    if (analysis?.sensitiveFunctions?.length) {
      section(doc, "Sensitive Functions Detected");
      analysis.sensitiveFunctions.forEach((fn, i) => {
        const riskColor = fn.riskScore >= 75 ? RED : fn.riskScore >= 50 ? AMBER : GREEN;
        doc
          .fillColor(TEXT_DARK)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`${i + 1}. ${fn.name}`, { continued: true })
          .fillColor(riskColor)
          .font("Helvetica")
          .text(`  [Risk: ${fn.riskScore}/100  •  ${fn.category}]`);

        if (fn.reason) {
          doc
            .fillColor(TEXT_MUTED)
            .fontSize(10)
            .text(fn.reason, { indent: 15, align: "justify" });
        }

        if (fn.recommendedTechniques?.length) {
          doc
            .fillColor(BRAND_BLUE)
            .fontSize(9)
            .font("Helvetica-Oblique")
            .text(`Recommended: ${fn.recommendedTechniques.join(", ")}`, { indent: 15 });
        }
        doc.moveDown(0.5);
      });
      doc.moveDown();
    }

    // ── Recommendations ────────────────────────────────────────────────────
    if (analysis?.recommendations?.length) {
      section(doc, "Recommendations");
      analysis.recommendations.forEach((r, i) => {
        doc
          .fillColor(TEXT_DARK)
          .fontSize(10)
          .font("Helvetica")
          .text(`${i + 1}. ${r}`, { indent: 10, align: "justify" });
        doc.moveDown(0.3);
      });
    }

    // ── Footer ─────────────────────────────────────────────────────────────
    doc
      .moveDown(3)
      .fontSize(9)
      .fillColor(TEXT_MUTED)
      .font("Helvetica-Oblique")
      .text(
        "This report is generated by ObfusShield AI. Confidential — do not distribute.",
        { align: "center" }
      );

    doc.end();

    stream.on("finish", () => {
      logger.info(`PDF report written: ${outputPath}`);
      resolve(outputPath);
    });
    stream.on("error", reject);
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function section(doc, title) {
  doc
    .moveDown(0.5)
    .fillColor(BRAND_BLUE)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(title)
    .moveDown(0.3)
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .strokeColor(BRAND_BLUE)
    .lineWidth(0.5)
    .stroke()
    .moveDown(0.5)
    .fillColor(TEXT_DARK)
    .font("Helvetica")
    .fontSize(11);
}

function labelValue(doc, label, value) {
  doc
    .fillColor(TEXT_MUTED)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`${label}: `, { continued: true })
    .fillColor(TEXT_DARK)
    .font("Helvetica")
    .text(String(value ?? "—"));
}

function metricsTable(doc, rows) {
  const PADDING = 5;
  const COL_LABEL_X = 58;
  const COL_VALUE_X = 260;
  const COL_WIDTH = 200;
  const ROW_GAP = 2;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  rows.forEach(([label, value]) => {
    const labelStr = String(label);
    const valueStr = String(value);

    doc.font("Helvetica").fontSize(10);
    const labelHeight = doc.heightOfString(labelStr, { width: COL_WIDTH });
    doc.font("Helvetica-Bold").fontSize(10);
    const valueHeight = doc.heightOfString(valueStr, { width: COL_WIDTH });
    const rowHeight = Math.max(labelHeight, valueHeight, 14) + PADDING * 2;

    // Start a fresh page rather than splitting a row across two pages.
    if (doc.y + rowHeight > bottomLimit) {
      doc.addPage();
    }

    const y = doc.y;
    doc
      .fillColor(BG_LIGHT)
      .rect(50, y, doc.page.width - 100, rowHeight)
      .fill()
      .fillColor(TEXT_MUTED)
      .font("Helvetica")
      .fontSize(10)
      .text(labelStr, COL_LABEL_X, y + PADDING, { width: COL_WIDTH })
      .fillColor(TEXT_DARK)
      .font("Helvetica-Bold")
      .text(valueStr, COL_VALUE_X, y + PADDING, { width: COL_WIDTH });
    doc.y = y + rowHeight + ROW_GAP;
  });
}

module.exports = { generateReport };
