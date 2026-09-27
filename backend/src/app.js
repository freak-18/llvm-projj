const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const { corsOptions } = require("./utils/corsConfig");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const uploadRoutes = require("./routes/upload");
const analyzeRoutes = require("./routes/analyze");
const obfuscateRoutes = require("./routes/obfuscate");
const metricsRoutes = require("./routes/metrics");
const downloadRoutes = require("./routes/download");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ── Security & Utilities ─────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── CORS ─────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ── Body parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Rate limiting ────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: { error: "Analysis rate limit exceeded — try again in an hour" },
});

app.use("/api/", apiLimiter);
app.use("/api/analyze", analyzeLimiter);

// ── Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/obfuscate", obfuscateRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/download", downloadRoutes);

// ── Health check ─────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 ──────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Central error handler ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
