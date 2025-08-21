import { Request, Response } from "express";
import prisma from "../db/client";
import env from "../config/env";
import { successResponse, errorResponse } from "../common/http";

interface HealthCheck {
  service: string;
  status: "healthy" | "unhealthy";
  latency?: number;
  error?: string;
}

export const healthCheck = async (req: Request, res: Response) => {
  const checks: HealthCheck[] = [];
  let overallHealth = true;

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      service: "database",
      status: "healthy",
      latency: Date.now() - dbStart,
    });
  } catch (error: any) {
    overallHealth = false;
    checks.push({
      service: "database",
      status: "unhealthy",
      error: error.message,
    });
  }

  // Redis check (if configured)
  if (env.REDIS_URL) {
    try {
      // TODO: Add Redis health check when Redis client is implemented
      checks.push({
        service: "redis",
        status: "healthy",
      });
    } catch (error: any) {
      checks.push({
        service: "redis",
        status: "unhealthy",
        error: error.message,
      });
    }
  }

  const healthData = {
    status: overallHealth ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks,
  };

  if (overallHealth) {
    return successResponse(res, healthData, "Service is healthy");
  } else {
    return res.status(503).json({
      success: false,
      message: "Service is unhealthy",
      data: healthData,
    });
  }
};

export const readinessCheck = async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return successResponse(res, { ready: true }, "Service is ready");
  } catch (error: any) {
    return errorResponse(res, "Service is not ready", 503);
  }
};

export const livenessCheck = (req: Request, res: Response) => {
  return successResponse(res, { alive: true }, "Service is alive");
};
