import { Router } from "express";
import { prisma } from "../db/client";
import { successResponse, errorResponse, validateQuery } from "../common/http";
import { searchRateLimit } from "../common/middleware/rateLimit";
import { z } from "zod";

const router = Router();

// Apply rate limiting to search endpoints
router.use(searchRateLimit);

// Zod schema for search query
const SearchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(100, "Query too long"),
  type: z
    .enum(["all", "companies", "news", "projects", "meetings"])
    .optional()
    .default("all"),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform(Number)
    .pipe(z.number().min(1).max(50)),
});

// Global search endpoint
router.get(
  "/",
  validateQuery(SearchQuerySchema),
  async (req: any, res, next) => {
    try {
      const { q, type, limit } = req.query;
      const results: any = {};

      // Search companies (public directory)
      if (type === "all" || type === "companies") {
        const companies = await prisma.company.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { region: { contains: q, mode: "insensitive" } },
              { gradeDK: { contains: q, mode: "insensitive" } },
              { roadClass: { contains: q, mode: "insensitive" } },
              {
                natureOfBusiness: {
                  hasSome: [q], // Search in array field
                },
              },
            ],
          },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            region: true,
            gradeDK: true,
            roadClass: true,
            natureOfBusiness: true,
            description: true,
            website: true,
          },
        });
        results.companies = companies;
      }

      // Search news
      if (type === "all" || type === "news") {
        const news = await prisma.news.findMany({
          where: {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          },
          take: limit,
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            title: true,
            publishedAt: true,
            author: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        results.news = news;
      }

      // Search projects
      if (type === "all" || type === "projects") {
        const projects = await prisma.projectItem.findMany({
          where: {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          take: limit,
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            publishedAt: true,
            author: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        results.projects = projects;
      }

      // Search meetings
      if (type === "all" || type === "meetings") {
        const meetings = await prisma.meeting.findMany({
          where: {
            title: { contains: q, mode: "insensitive" },
          },
          take: limit,
          orderBy: { scheduledAt: "asc" },
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        results.meetings = meetings;
      }

      // Calculate total results
      const totalResults = Object.values(results).reduce(
        (total: number, items: any) => total + (items?.length || 0),
        0
      );

      return successResponse(
        res,
        {
          query: q,
          type,
          totalResults,
          results,
        },
        `Found ${totalResults} results for "${q}"`
      );
    } catch (error) {
      next(error);
    }
  }
);

// Search suggestions endpoint (for autocomplete)
router.get(
  "/suggestions",
  validateQuery(
    z.object({
      q: z.string().min(1, "Query is required").max(50, "Query too long"),
      type: z
        .enum(["companies", "news", "projects"])
        .optional()
        .default("companies"),
    })
  ),
  async (req: any, res, next) => {
    try {
      const { q, type } = req.query;
      let suggestions: string[] = [];

      if (type === "companies") {
        const companies = await prisma.company.findMany({
          where: {
            name: { contains: q, mode: "insensitive" },
          },
          take: 10,
          select: { name: true },
        });
        suggestions = companies.map((c) => c.name);
      } else if (type === "news") {
        const news = await prisma.news.findMany({
          where: {
            title: { contains: q, mode: "insensitive" },
          },
          take: 10,
          select: { title: true },
        });
        suggestions = news.map((n) => n.title);
      } else if (type === "projects") {
        const projects = await prisma.projectItem.findMany({
          where: {
            title: { contains: q, mode: "insensitive" },
          },
          take: 10,
          select: { title: true },
        });
        suggestions = projects.map((p) => p.title);
      }

      return successResponse(res, suggestions, "Search suggestions retrieved");
    } catch (error) {
      next(error);
    }
  }
);

// Advanced company search with filters
router.get(
  "/companies",
  validateQuery(
    z.object({
      q: z.string().optional(),
      region: z.string().optional(),
      grade: z.string().optional(),
      roadClass: z.string().optional(),
      nature: z.string().optional(),
      page: z.string().transform(Number).optional().default("1"),
      limit: z
        .string()
        .transform(Number)
        .optional()
        .default("20")
        .pipe(z.number().min(1).max(100)),
    })
  ),
  async (req: any, res, next) => {
    try {
      const { q, region, grade, roadClass, nature, page, limit } = req.query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (q) {
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ];
      }

      if (region) where.region = { contains: region, mode: "insensitive" };
      if (grade) where.gradeDK = grade;
      if (roadClass)
        where.roadClass = { contains: roadClass, mode: "insensitive" };
      if (nature) {
        where.natureOfBusiness = {
          hasSome: [nature],
        };
      }

      const [companies, total] = await prisma.$transaction([
        prisma.company.findMany({
          where,
          take: limit,
          skip,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
            address: true,
            region: true,
            gradeDK: true,
            roadClass: true,
            natureOfBusiness: true,
            description: true,
            createdAt: true,
          },
        }),
        prisma.company.count({ where }),
      ]);

      const meta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };

      return successResponse(
        res,
        companies,
        "Companies search completed",
        200,
        meta
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
