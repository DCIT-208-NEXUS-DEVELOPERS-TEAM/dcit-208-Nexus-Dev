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
const NewsCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
});

const NewsUpdateSchema = NewsCreateSchema.partial();

const NewsQuerySchema = z.object({
  q: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

// Public: List news with pagination and search
router.get("/", validateQuery(NewsQuerySchema), async (req: any, res, next) => {
  try {
    const { q } = req.query;
    const { skip, take, page } = parsePagination(req.query);

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ];
    }

    const [news, total] = await prisma.$transaction([
      prisma.news.findMany({
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
      prisma.news.count({ where }),
    ]);

    const meta = createPaginationMeta(page, take, total);
    return successResponse(res, news, "News retrieved successfully", 200, meta);
  } catch (error) {
    next(error);
  }
});

// Public: Get single news item
router.get("/:id", async (req, res, next) => {
  try {
    const news = await prisma.news.findUnique({
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

    if (!news) {
      return errorResponse(res, "News item not found", 404);
    }

    return successResponse(res, news, "News item retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// Protected: Create news (Admin and National Secretariat only)
router.post(
  "/",
  authenticateToken,
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT),
  validateBody(NewsCreateSchema),
  async (req: any, res, next) => {
    try {
      const { title, content } = req.body;

      const news = await prisma.news.create({
        data: {
          title,
          content,
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

      return successResponse(res, news, "News created successfully", 201);
    } catch (error) {
      next(error);
    }
  }
);

// Protected: Update news (Admin and author only)
router.patch(
  "/:id",
  authenticateToken,
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT),
  validateBody(NewsUpdateSchema),
  async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if news exists and user has permission
      const existingNews = await prisma.news.findUnique({
        where: { id },
      });

      if (!existingNews) {
        return errorResponse(res, "News item not found", 404);
      }

      // Admin can edit any news, authors can edit their own
      if (
        req.user.role !== Role.ADMIN &&
        existingNews.authorId !== req.user.id
      ) {
        return errorResponse(res, "Insufficient permissions", 403);
      }

      const news = await prisma.news.update({
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

      return successResponse(res, news, "News updated successfully");
    } catch (error) {
      next(error);
    }
  }
);

// Protected: Delete news (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole(Role.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const existingNews = await prisma.news.findUnique({
        where: { id },
      });

      if (!existingNews) {
        return errorResponse(res, "News item not found", 404);
      }

      await prisma.news.delete({
        where: { id },
      });

      return successResponse(res, null, "News deleted successfully", 204);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
