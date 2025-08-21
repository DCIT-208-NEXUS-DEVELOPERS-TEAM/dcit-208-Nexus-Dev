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
const ProjectCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
});

const ProjectUpdateSchema = ProjectCreateSchema.partial();

const ProjectQuerySchema = z.object({
  q: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

// Public: List projects with pagination and search
router.get(
  "/",
  validateQuery(ProjectQuerySchema),
  async (req: any, res, next) => {
    try {
      const { q } = req.query;
      const { skip, take, page } = parsePagination(req.query);

      const where: any = {};
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ];
      }

      const [projects, total] = await prisma.$transaction([
        prisma.projectItem.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          take,
          skip,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        }),
        prisma.projectItem.count({ where }),
      ]);

      const meta = createPaginationMeta(page, take, total);
      return successResponse(
        res,
        projects,
        "Projects retrieved successfully",
        200,
        meta
      );
    } catch (error) {
      next(error);
    }
  }
);

// Public: Get single project
router.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.projectItem.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!project) {
      return errorResponse(res, "Project not found", 404);
    }

    return successResponse(res, project, "Project retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// Protected: Create project (Admin and National Secretariat only)
router.post(
  "/",
  authenticateToken,
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT),
  validateBody(ProjectCreateSchema),
  async (req: any, res, next) => {
    try {
      const { title, description } = req.body;

      const project = await prisma.projectItem.create({
        data: {
          title,
          description,
          authorId: req.user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return successResponse(res, project, "Project created successfully", 201);
    } catch (error) {
      next(error);
    }
  }
);

// Protected: Update project (Admin and author only)
router.patch(
  "/:id",
  authenticateToken,
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT),
  validateBody(ProjectUpdateSchema),
  async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if project exists and user has permission
      const existingProject = await prisma.projectItem.findUnique({
        where: { id },
      });

      if (!existingProject) {
        return errorResponse(res, "Project not found", 404);
      }

      // Admin can edit any project, authors can edit their own
      if (
        req.user.role !== Role.ADMIN &&
        existingProject.authorId !== req.user.id
      ) {
        return errorResponse(res, "Insufficient permissions", 403);
      }

      const project = await prisma.projectItem.update({
        where: { id },
        data: updates,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return successResponse(res, project, "Project updated successfully");
    } catch (error) {
      next(error);
    }
  }
);

// Protected: Delete project (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole(Role.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const existingProject = await prisma.projectItem.findUnique({
        where: { id },
      });

      if (!existingProject) {
        return errorResponse(res, "Project not found", 404);
      }

      await prisma.projectItem.delete({
        where: { id },
      });

      return successResponse(res, null, "Project deleted successfully", 204);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
