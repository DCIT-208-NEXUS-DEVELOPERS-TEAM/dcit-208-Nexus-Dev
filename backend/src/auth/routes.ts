import { Router } from "express";
import { AuthService } from "./service";
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from "./types";
import { validateBody } from "../common/http";
import { successResponse, errorResponse } from "../common/http";
import { authenticateToken } from "../common/middleware/auth";
import { authRateLimit } from "../common/middleware/rateLimit";

const router = Router();

// Apply rate limiting to auth routes
router.use(authRateLimit);

// Register
router.post(
  "/register",
  validateBody(RegisterSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.register(req.body);
      return successResponse(res, result, "User registered successfully", 201);
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post("/login", validateBody(LoginSchema), async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body);
    return successResponse(res, result, "Login successful");
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post(
  "/refresh",
  validateBody(RefreshTokenSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.refreshToken(req.body.refreshToken);
      return successResponse(res, result, "Token refreshed successfully");
    } catch (error) {
      next(error);
    }
  }
);

// Get profile
router.get("/profile", authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const profile = await AuthService.getProfile(req.user.id);
    return successResponse(res, profile, "Profile retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// Logout (client-side token removal, could be enhanced with token blacklisting)
router.post("/logout", authenticateToken, (req, res) => {
  return successResponse(res, null, "Logout successful");
});

export default router;
