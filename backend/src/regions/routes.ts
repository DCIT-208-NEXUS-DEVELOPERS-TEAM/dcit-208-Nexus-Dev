import { Router } from "express";
import { prisma } from "../db/client";

const router = Router();

router.get("/", async (_req, res) => {
  const regions = await prisma.region.findMany({ orderBy: { name: "asc" } });
  res.json(regions);
});

export default router;
