import { Request, Response } from "express";
import { ZodSchema } from "zod";
import { ValidationError } from "./errors";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200,
  meta?: ApiResponse["meta"]
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: Array<{ field: string; message: string }>
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(errors && { errors }),
  };
  return res.status(statusCode).json(response);
};

export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: any) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      return next();
    } catch (error: any) {
      if (error.issues) {
        const validationErrors = error.issues.map((err: any) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return errorResponse(res, "Validation failed", 400, validationErrors);
      }
      throw new ValidationError("Invalid request body");
    }
  };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: any) => {
    try {
      const result = schema.parse(req.query);
      req.query = result as any;
      return next();
    } catch (error: any) {
      if (error.issues) {
        const validationErrors = error.issues.map((err: any) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return errorResponse(
          res,
          "Query validation failed",
          400,
          validationErrors
        );
      }
      throw new ValidationError("Invalid query parameters");
    }
  };
};

export interface PaginationQuery {
  page?: number;
  limit?: number;
  cursor?: string;
}

export const parsePagination = (
  query: any
): { skip: number; take: number; page: number } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
    page,
  };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): ApiResponse["meta"] => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};
