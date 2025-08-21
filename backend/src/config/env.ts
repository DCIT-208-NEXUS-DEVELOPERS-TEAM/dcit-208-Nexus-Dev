import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).default(4000),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES: z.string().default("15m"),
  REFRESH_SECRET: z
    .string()
    .min(32, "REFRESH_SECRET must be at least 32 characters"),
  REFRESH_EXPIRES: z.string().default("7d"),

  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // File Storage
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("abcecg-files"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Email
  MAIL_FROM: z.string().default("ABCECG <noreply@abcecg.org>"),
  MAIL_PROVIDER: z.enum(["sendgrid", "ses", "smtp"]).default("sendgrid"),
  MAIL_API_KEY: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),

  // Logging
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error"])
    .default("info"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(
        (err) => `${err.path.join(".")}: ${err.message}`
      );
      throw new Error(
        `Environment validation failed:\n${missingVars.join("\n")}`
      );
    }
    throw error;
  }
}

export const env = validateEnv();

export default env;
