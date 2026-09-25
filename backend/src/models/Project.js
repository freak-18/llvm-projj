const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    language: {
      type: String,
      enum: ["c", "c++", "rust", "go", "python", "java"],
      required: true,
    },
    protectionProfile: {
      type: String,
      enum: ["basic", "advanced", "enterprise", "military"],
      default: "advanced",
    },
    status: {
      type: String,
      enum: ["uploaded", "queued", "analyzing", "analyzed", "obfuscating", "completed", "failed"],
      default: "uploaded",
    },
    securityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    analysisJobId: String,
    obfuscationJobId: String,
  },
  { timestamps: true }
);

// Index for dashboard queries
projectSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Project", projectSchema);
