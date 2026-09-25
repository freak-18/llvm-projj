require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB } = require("./config/db");
const logger = require("./utils/logger");
const { Server: SocketIO } = require("socket.io");

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  // Connect MongoDB Atlas
  await connectDB();

  // Create HTTP server
  const server = http.createServer(app);

  // ── Socket.IO ────────────────────────────────────────────────────────────
  const io = new SocketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Attach io to the Express app so routes can emit events
  app.io = io;

  io.on("connection", (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Client joins a project room to receive real-time updates
    socket.on("join:project", (projectId) => {
      socket.join(`project:${projectId}`);
      logger.debug(`Socket ${socket.id} joined project:${projectId}`);
    });

    socket.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // ── Start server ─────────────────────────────────────────────────────────
  server.listen(PORT, () => {
    logger.info(`ObfusShield backend running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received — shutting down gracefully");
    server.close(() => process.exit(0));
  });
  process.on("SIGINT", () => {
    logger.info("SIGINT received — shutting down gracefully");
    server.close(() => process.exit(0));
  });
}

bootstrap().catch((err) => {
  logger.error(`Fatal bootstrap error: ${err.message}`);
  process.exit(1);
});
