const mongoose = require("mongoose");

const sensitiveFunctionSchema = new mongoose.Schema({
  name: String,
  riskScore: { type: Number, min: 0, max: 100 },
  category: {
    type: String,
    enum: ["authentication", "encryption", "license", "payment", "secret", "business-logic", "api-key", "auth", "crypto", "other"],
  },
  reason: String,
  recommendedTechniques: [String],
}, { _id: false });

const analysisReportSchema = new mongoose.Schema(
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
    summary: String,
    overallRisk: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
    },
    sensitiveFunctions: [sensitiveFunctionSchema],
    recommendations: [String],
    metrics: {
      complexityIncreasePct: Number,
      entropyIncreasePct: Number,
      reverseEngineeringResistance: Number,
      tamperResistance: Number,
      protectionCoverage: Number,
      securityScore: Number,
      cfgGrowthPct: Number,
      stringProtectionPct: Number,
      protectedFunctionsPct: Number,
    },
    rawAiResponse: String,
    // Source: "ai_service", "ai_gateway" (Lovable/Gemini fallback), or "mock"
    analysisSource: {
      type: String,
      enum: ["ai_service", "ai_gateway", "mock"],
      default: "ai_service",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AnalysisReport", analysisReportSchema);
