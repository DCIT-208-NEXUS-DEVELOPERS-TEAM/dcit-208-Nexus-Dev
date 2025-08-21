import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authenticateToken } from "./common/middleware/auth";

// Import module routes
import authRoutes from "./auth/routes";
import regionsRoutes from "./regions/routes";
import companiesRoutes from "./companies/routes";
import applicationsRoutes from "./applications/routes";
import filesRoutes from "./files/routes";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/regions", regionsRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/files", filesRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 ABCECG API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

export default app;
