import express from "express";
import cors from "cors";
import helmet from "helmet";
import { AppError } from "./common/errors";
import { errorResponse } from "./common/http";
import { requestIdMiddleware } from "./common/middleware/requestId";
import { metricsMiddleware } from "./observability/metrics";
import { apiRateLimit } from "./common/middleware/rateLimit";
import {
  healthCheck,
  readinessCheck,
  livenessCheck,
} from "./observability/health";
import { getMetrics } from "./observability/metrics";
import env from "./config/env";
import logger from "./config/logger";

// Import existing auth routes (we'll migrate these)
import authRoutes from "./auth/routes";

// Import new module routes
import regionsRoutes from "./regions/routes";
import companiesRoutes from "./companies/routes";
import applicationsRoutes from "./applications/routes";
import filesRoutes from "./files/routes";

// Import content routes
import newsRoutes from "./content/news.routes";
import projectsRoutes from "./content/projects.routes";
import meetingsRoutes from "./content/meetings.routes";

// Import search routes
import searchRoutes from "./search/routes";

const app = express();

// Trust proxy (for accurate IP addresses behind load balancers)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request ID middleware
app.use(requestIdMiddleware);

// Metrics middleware
app.use(metricsMiddleware);

// Logging middleware
app.use((req, res, next) => {
  logger.info(
    {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    },
    "Incoming request"
  );
  next();
});

// Rate limiting for API routes
app.use("/api", apiRateLimit);

// Health and metrics endpoints (before authentication)
app.get("/health", healthCheck);
app.get("/health/ready", readinessCheck);
app.get("/health/live", livenessCheck);
app.get("/metrics", getMetrics);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/regions", regionsRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/files", filesRoutes);

// Content routes
app.use("/api/news", newsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/meetings", meetingsRoutes);

// Search routes
app.use("/api/search", searchRoutes);

// 404 handler
app.use("*", (req, res) => {
  return errorResponse(res, "Route not found", 404);
});

// Global error handler
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(
      {
        requestId: req.requestId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
      "Request error"
    );

    // Handle known application errors
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.statusCode);
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return errorResponse(res, error.message, 400);
    }

    // Handle JWT errors
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid token", 401);
    }

    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Token expired", 401);
    }

    // Handle Prisma errors
    if (error.name === "PrismaClientKnownRequestError") {
      if (error.code === "P2002") {
        return errorResponse(res, "Duplicate entry", 409);
      }
      if (error.code === "P2025") {
        return errorResponse(res, "Record not found", 404);
      }
    }

    // Default to 500 server error
    return errorResponse(res, "Internal server error", 500);
  }
);

export default app;
