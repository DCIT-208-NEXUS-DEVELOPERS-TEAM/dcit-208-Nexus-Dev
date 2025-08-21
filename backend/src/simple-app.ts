import express from "express";
import cors from "cors";
import helmet from "helmet";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "healthy", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
});

// Basic test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
