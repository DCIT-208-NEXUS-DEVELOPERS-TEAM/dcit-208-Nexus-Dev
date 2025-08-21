import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "../../db/client";
import env from "../../config/env";
import { AuthenticationError, AuthorizationError } from "../errors";
import { errorResponse } from "../http";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  regionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    if (!token) {
      return errorResponse(res, "Access token required", 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        regionId: true,
        isActive: true,
      },
    });

    if (!user) {
      return errorResponse(res, "User not found", 401);
    }

    if (!user.isActive) {
      return errorResponse(res, "Account is deactivated", 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      regionId: user.regionId || undefined,
    };

    return next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid token", 401);
    }
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Token expired", 401);
    }
    return errorResponse(res, "Authentication failed", 401);
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, "Insufficient permissions", 403);
    }

    return next();
  };
};

export const requireOwnership = (
  getResourceOwnerId: (req: Request) => Promise<string | null>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return errorResponse(res, "Authentication required", 401);
      }

      // Admins and secretariat can access any resource
      if (
        [Role.ADMIN, Role.NATIONAL_SECRETARIAT].includes(req.user.role as Role)
      ) {
        return next();
      }

      const resourceOwnerId = await getResourceOwnerId(req);

      if (!resourceOwnerId || resourceOwnerId !== req.user.id) {
        return errorResponse(res, "Access denied", 403);
      }

      return next();
    } catch (error) {
      return errorResponse(res, "Authorization check failed", 500);
    }
  };
};

export const requireRegionAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return errorResponse(res, "Authentication required", 401);
  }

  // Admins and national secretariat have access to all regions
  if ([Role.ADMIN, Role.NATIONAL_SECRETARIAT].includes(req.user.role)) {
    return next();
  }

  // Regional secretariat can only access their region
  if (req.user.role === Role.REGIONAL_SECRETARIAT) {
    const requestedRegion =
      req.params.regionId || req.body.regionId || req.query.regionId;

    if (requestedRegion && requestedRegion !== req.user.regionId) {
      return errorResponse(res, "Access denied for this region", 403);
    }
  }

  return next();
};
