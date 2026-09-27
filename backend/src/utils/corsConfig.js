/**
 * CORS Configuration and Allowed Origins Helper for ObfusShield Backend
 */

function isAllowedOrigin(origin) {
  // Allow non-browser requests (curl, Postman, server-to-server, mobile apps)
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/$/, "");

  // Collect origins configured via environment variables
  const envOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    process.env.ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((val) => val.split(","))
    .map((o) => o.trim().replace(/\/$/, ""));

  // Check if wildcard '*' is explicitly enabled in env
  if (envOrigins.includes("*")) {
    return true;
  }

  const allowedList = new Set([
    "https://llvm-projj.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:4173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    ...envOrigins,
  ]);

  if (allowedList.has(normalizedOrigin)) {
    return true;
  }

  // Allow any Vercel domain (*.vercel.app)
  if (/^https:\/\/.*\.vercel\.app$/.test(normalizedOrigin)) {
    return true;
  }

  // Allow localhost / 127.0.0.1 in non-production environment
  if (
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(normalizedOrigin)
  ) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    // Return null, false to reject origin without throwing uncaught server error
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
  ],
  optionsSuccessStatus: 200,
};

module.exports = {
  isAllowedOrigin,
  corsOptions,
};
