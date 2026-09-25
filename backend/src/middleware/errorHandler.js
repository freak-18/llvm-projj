const logger = require("../utils/logger");

/**
 * Central Express error handler.
 * Must be registered LAST: app.use(errorHandler)
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  // Log stack trace in dev, just message in prod
  if (process.env.NODE_ENV !== "production") {
    logger.error(err.stack || message);
  } else {
    logger.error(message);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
