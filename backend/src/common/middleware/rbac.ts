import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    // assumes your auth middleware sets req.user = { id, role, regionId }
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
