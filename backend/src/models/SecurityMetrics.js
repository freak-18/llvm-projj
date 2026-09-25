const mongoose = require("mongoose");

// Aggregated security metrics per project (updated after each analysis/obfuscation)
const securityMetricsSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Security score: S = 0.3C + 0.25E + 0.2G + 0.15Str + 0.1P
    securityScore: { type: Number, default: 0 },
    complexityScore: { type: Number, default: 0 },   // C
    entropyScore: { type: Number, default: 0 },       // E
    cfgGrowthScore: { type: Number, default: 0 },     // G
    stringProtectionScore: { type: Number, default: 0 }, // Str
    functionProtectionScore: { type: Number, default: 0 }, // P
    reverseEngineeringResistance: { type: Number, default: 0 },
    tamperResistance: { type: Number, default: 0 },
    protectionCoverage: { type: Number, default: 0 },
    // Number of analysis runs
    analysisCount: { type: Number, default: 0 },
    obfuscationCount: { type: Number, default: 0 },
    lastAnalyzedAt: Date,
    lastObfuscatedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("SecurityMetrics", securityMetricsSchema);
