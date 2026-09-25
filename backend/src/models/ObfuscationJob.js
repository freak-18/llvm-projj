const mongoose = require("mongoose");

const obfuscationJobSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    protectionProfile: {
      type: String,
      enum: ["basic", "advanced", "enterprise", "military"],
    },
    // Applied LLVM passes
    appliedPasses: [String],
    // Metrics from LLVM service
    metrics: {
      complexityIncrease: Number,
      cfgGrowthPct: Number,
      entropyIncrease: Number,
      stringProtection: Number,
      protectedFunctions: Number,
      securityScore: Number,
    },
    // LLVM IR paths (relative to uploads dir)
    inputIrPath: String,
    obfuscatedIrPath: String,
    outputObjectPath: String,
    // CFG dot file path for visualization
    cfgDotPath: String,
    cfgJsonPath: String,
    // Final report PDF path
    reportPdfPath: String,
    // Error message if failed
    error: String,
    // Duration in ms
    durationMs: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ObfuscationJob", obfuscationJobSchema);
