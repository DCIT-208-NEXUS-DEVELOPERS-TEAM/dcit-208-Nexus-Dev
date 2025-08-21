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

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email, username, and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             username: "john_doe"
 *             email: "john@example.com"
 *             password: "Password123"
 *             firstName: "John"
 *             lastName: "Doe"
 *             phone: "+233123456789"
 *             regionId: "uuid-region-id"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password, returns JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "admin@abcecg.org"
 *             password: "Admin@123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials or account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
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
