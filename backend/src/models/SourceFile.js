const mongoose = require("mongoose");

const sourceFileSchema = new mongoose.Schema(
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
    filename: {
      type: String,
      required: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 200000, // 200KB source per file
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    language: String,
    // Path to the stored file on disk (for LLVM processing)
    storagePath: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("SourceFile", sourceFileSchema);
