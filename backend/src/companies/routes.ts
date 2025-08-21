import { Router } from "express";
import { prisma } from "../db/client";
import { body, query } from "express-validator";
import { requireRole } from "../common/middleware/rbac";
import { Role } from "@prisma/client";

const router = Router();

// List + filters
router.get(
  "/",
  [
    query("q").optional().isString(),
    query("region").optional().isString(),
    query("grade").optional().isString(),
    query("roadClass").optional().isString(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    const { q, region, grade, roadClass } = req.query as Record<string, string>;
    const where: any = {};
    if (q)
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    if (region) where.region = region;
    if (grade) where.gradeDK = grade;
    if (roadClass) where.roadClass = roadClass;

    const companies = await prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(req.query.limit ?? 20),
    });
    res.json(companies);
  }
);

// Get
router.get("/:id", async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: {
      certificates: true,
      equipment: true,
      projects: true,
      documents: true,
    },
  });
  if (!company) return res.status(404).json({ message: "Not found" });
  res.json(company);
});

// Create (Company Rep or Admin)
router.post(
  "/",
  requireRole(Role.ADMIN, Role.COMPANY_REP),
  [body("name").isString().isLength({ min: 2 })],
  async (req: any, res) => {
    const data = req.body;
    const company = await prisma.company.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        gpsAddress: data.gpsAddress,
        region: data.region,
        gradeDK: data.gradeDK,
        roadClass: data.roadClass,
        natureOfBusiness: data.natureOfBusiness ?? [],
        description: data.description,
        ownerUserId: req.user?.id ?? null,
      },
    });
    res.status(201).json(company);
  }
);

// Update (Admin or company owner)
router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.COMPANY_REP),
  async (req: any, res) => {
    const { id } = req.params;
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Not found" });
    // If Company Rep, only allow update if they own it
    if (
      req.user.role === Role.COMPANY_REP &&
      existing.ownerUserId !== req.user.id
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const updated = await prisma.company.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  }
);

export default router;
