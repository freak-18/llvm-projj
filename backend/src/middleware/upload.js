const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload dir exists and use an absolute path for source storage
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = [".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".rs", ".go", ".ll", ".py", ".java"];
const MAX_FILE_SIZE = 200 * 1024; // 200KB per file
const MAX_FILES = 20;

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    // Per-project subdirectory, created at project creation
    const safeDir = path.resolve(UPLOAD_DIR);
    const dir = path.join(safeDir, req.body.projectId || "tmp");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    // Sanitize filename — strip path traversal characters
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safe);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter,
});

module.exports = upload;
