import app from "./app";
import env from "./config/env";
import logger from "./config/logger";

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 ABCECG API running on port ${PORT}`);
  logger.info(`📍 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/docs`);
});

export default app;
