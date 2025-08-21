import client from "prom-client";
import { Request, Response, NextFunction } from "express";

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  register,
  prefix: "abcecg_api_",
});

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: "abcecg_api_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
  name: "abcecg_api_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const activeConnections = new client.Gauge({
  name: "abcecg_api_active_connections",
  help: "Number of active connections",
});

const databaseConnectionPool = new client.Gauge({
  name: "abcecg_api_database_pool_size",
  help: "Database connection pool size",
  labelNames: ["state"], // 'active', 'idle', 'total'
});

const applicationInfo = new client.Gauge({
  name: "abcecg_api_info",
  help: "Application information",
  labelNames: ["version", "environment"],
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseConnectionPool);
register.registerMetric(applicationInfo);

// Set application info
applicationInfo.set(
  {
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  1
);

// Middleware to collect HTTP metrics
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Track active connections
  activeConnections.inc();

  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: any[]) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    // Record metrics
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    httpRequestTotal.labels(req.method, route, res.statusCode.toString()).inc();

    // Decrease active connections
    activeConnections.dec();

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};

// Metrics endpoint
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate metrics" });
  }
};

// Function to update database pool metrics (to be called periodically)
export const updateDatabaseMetrics = (poolStats: {
  active: number;
  idle: number;
  total: number;
}) => {
  databaseConnectionPool.set({ state: "active" }, poolStats.active);
  databaseConnectionPool.set({ state: "idle" }, poolStats.idle);
  databaseConnectionPool.set({ state: "total" }, poolStats.total);
};

export { register };
