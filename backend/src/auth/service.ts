import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Role } from "@prisma/client";
import prisma from "../db/client";
import env from "../config/env";
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../common/errors";
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  JWTPayload,
} from "./types";

export class AuthService {
  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private static generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      regionId: user.regionId || undefined,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET as string, {
      expiresIn: env.JWT_EXPIRES,
    });

    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh" },
      env.REFRESH_SECRET as string,
      { expiresIn: env.REFRESH_EXPIRES }
    );

    return { accessToken, refreshToken };
  }

  static async register(data: RegisterRequest): Promise<AuthResponse> {
    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new ConflictError("Email already exists");
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUsername) {
      throw new ConflictError("Username already exists");
    }

    // Validate region if provided
    if (data.regionId) {
      const region = await prisma.region.findUnique({
        where: { id: data.regionId },
      });

      if (!region) {
        throw new ValidationError("Invalid region ID");
      }
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        regionId: data.regionId,
        role: Role.MEMBER, // Default role
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        regionId: user.regionId,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AuthenticationError("Account is deactivated");
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        regionId: user.regionId,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, env.REFRESH_SECRET) as any;

      if (decoded.type !== "refresh") {
        throw new AuthenticationError("Invalid refresh token");
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        throw new AuthenticationError("User not found or inactive");
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return {
        success: true,
        message: "Token refreshed successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          regionId: user.regionId,
          createdAt: user.createdAt,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        throw new AuthenticationError("Invalid or expired refresh token");
      }
      throw error;
    }
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        regionId: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        region: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    return user;
  }
}
