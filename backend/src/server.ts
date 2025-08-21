import app from "./app";
import env from "./config/env";
import logger from "./config/logger";
import prisma from "./db/client";

const PORT = env.PORT;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Close database connections
    await prisma.$disconnect();
    logger.info("Database connections closed");

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 ABCECG Backend API running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
  logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
});

export default server;
