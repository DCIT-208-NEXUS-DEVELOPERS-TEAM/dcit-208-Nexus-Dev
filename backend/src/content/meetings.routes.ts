import { Router } from "express";
import { prisma } from "../db/client";
import { authenticateToken, requireRole } from "../common/middleware/auth";
import { Role } from "@prisma/client";
import {
  successResponse,
  errorResponse,
  validateBody,
  validateQuery,
  parsePagination,
  createPaginationMeta,
} from "../common/http";
import { z } from "zod";

const router = Router();

// Zod schemas
const MeetingCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  scheduledAt: z.string().datetime("Invalid date format"),
  link: z.string().url("Invalid URL").optional(),
});

const MeetingUpdateSchema = MeetingCreateSchema.partial();

const MeetingQuerySchema = z.object({
  q: z.string().optional(),
  upcoming: z.enum(["true", "false"]).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

// Public: List meetings with pagination and search
router.get(
  "/",
  validateQuery(MeetingQuerySchema),
  async (req: any, res, next) => {
    try {
      const { q, upcoming } = req.query;
      const { skip, take, page } = parsePagination(req.query);

      const where: any = {};

      if (q) {
        where.OR = [{ title: { contains: q, mode: "insensitive" } }];
      }

      if (upcoming === "true") {
        where.scheduledAt = {
          gte: new Date(),
        };
      }

      const [meetings, total] = await prisma.$transaction([
        prisma.meeting.findMany({
          where,
          orderBy: { scheduledAt: "asc" },
          take,
          skip,
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        }),
        prisma.meeting.count({ where }),
      ]);

      const meta = createPaginationMeta(page, take, total);
      return successResponse(
        res,
        meetings,
        "Meetings retrieved successfully",
        200,
        meta
      );
    } catch (error) {
      next(error);
    }
  }
);

// Public: Get single meeting
router.get("/:id", async (req, res, next) => {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!meeting) {
      return errorResponse(res, "Meeting not found", 404);
    }

    return successResponse(res, meeting, "Meeting retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// Protected: Create meeting (Admin and National/Regional Secretariat)
router.post(
  "/",
  authenticateToken,
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT, Role.REGIONAL_SECRETARIAT),
  validateBody(MeetingCreateSchema),
  async (req: any, res, next) => {
    try {
      const { title, scheduledAt, link } = req.body;

      const meeting = await prisma.meeting.create({
        data: {
          title,
          scheduledAt: new Date(scheduledAt),
          link,
          createdById: req.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return successResponse(res, meeting, "Meeting created successfully", 201);
    } catch (error) {
      next(error);
    }
  }
);

// Protected: Update meeting (Admin and creator only)
router.patch(
  "/:id",
  authenticateToken,
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT, Role.REGIONAL_SECRETARIAT),
  validateBody(MeetingUpdateSchema),
  async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Convert scheduledAt to Date if provided
      if (updates.scheduledAt) {
        updates.scheduledAt = new Date(updates.scheduledAt);
      }

      // Check if meeting exists and user has permission
      const existingMeeting = await prisma.meeting.findUnique({
        where: { id },
      });

      if (!existingMeeting) {
        return errorResponse(res, "Meeting not found", 404);
      }

      // Admin can edit any meeting, creators can edit their own
      if (
        req.user.role !== Role.ADMIN &&
        existingMeeting.createdById !== req.user.id
      ) {
        return errorResponse(res, "Insufficient permissions", 403);
      }

      const meeting = await prisma.meeting.update({
        where: { id },
        data: updates,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return successResponse(res, meeting, "Meeting updated successfully");
    } catch (error) {
      next(error);
    }
  }
);

// Protected: Delete meeting (Admin and creator only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT, Role.REGIONAL_SECRETARIAT),
  async (req: any, res, next) => {
    try {
      const { id } = req.params;

      const existingMeeting = await prisma.meeting.findUnique({
        where: { id },
      });

      if (!existingMeeting) {
        return errorResponse(res, "Meeting not found", 404);
      }

      // Admin can delete any meeting, creators can delete their own
      if (
        req.user.role !== Role.ADMIN &&
        existingMeeting.createdById !== req.user.id
      ) {
        return errorResponse(res, "Insufficient permissions", 403);
      }

      await prisma.meeting.delete({
        where: { id },
      });

      return successResponse(res, null, "Meeting deleted successfully", 204);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
