import { Router } from "express";
import { prisma } from "../db/client";
import { successResponse } from "../common/http";

const router = Router();

/**
 * @swagger
 * /api/regions:
 *   get:
 *     summary: Get all Ghana regions
 *     description: Retrieve a list of all 16 regions in Ghana (public endpoint)
 *     tags: [Regions]
 *     responses:
 *       200:
 *         description: Regions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Region'
 *             example:
 *               success: true
 *               message: "Regions retrieved successfully"
 *               data:
 *                 - id: "uuid-1"
 *                   name: "Greater Accra"
 *                 - id: "uuid-2"
 *                   name: "Ashanti"
 */
router.get("/", async (_req, res, next) => {
  try {
    const regions = await prisma.region.findMany({ orderBy: { name: "asc" } });
    return successResponse(res, regions, "Regions retrieved successfully");
  } catch (error) {
    next(error);
  }
});

export default router;
