import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { Pool, PoolConfig } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import {
  User,
  UserRegistrationRequest,
  UserRegistrationResponse,
  LoginRequest,
  LoginResponse,
  ApiResponse,
} from "./types";

dotenv.config();

const dbConfig: PoolConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "nexus_dev",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
const pool = new Pool(dbConfig);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = "24h";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Nexus Backend API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

const validateRegistration = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("first_name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("First name is required and must be less than 100 characters"),
  body("last_name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Last name is required and must be less than 100 characters"),
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

function handleValidationErrors(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.type === "field" ? error.path : "unknown",
        message: error.msg,
      })),
    });
  }
  next();
}

function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function extractToken(authHeader: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  } catch (error: any) {
    if (
      error.code === "28000" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND"
    ) {
      console.error("Database error in findByEmail:", error.message);
      return null;
    }
    throw error;
  }
}

async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const query = "SELECT * FROM users WHERE username = $1";
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  } catch (error: any) {
    if (
      error.code === "28000" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND"
    ) {
      console.error("Database error in findByUsername:", error.message);
      return null;
    }
    throw error;
  }
}

async function findUserById(id: number): Promise<User | null> {
  const query = "SELECT * FROM users WHERE id = $1";
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

// --- Auth Middleware ---
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
}

async function authenticateToken(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader || "");
    if (!token) {
      res
        .status(401)
        .json({ success: false, message: "Access token required" });
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await findUserById(decoded.id);
    if (!user) {
      res.status(401).json({ success: false, message: "User not found" });
      return;
    }
    if (!user.is_active) {
      res
        .status(401)
        .json({ success: false, message: "Account is deactivated" });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    next();
  } catch (error: any) {
    console.error("Authentication error:", error);
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

// --- Auth Endpoints ---
app.post(
  "/api/auth/register",
  validateRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const userData: UserRegistrationRequest = req.body;
      const existingEmail = await findUserByEmail(userData.email);
      if (existingEmail) {
        res
          .status(400)
          .json({ success: false, message: "Email already exists" });
        return;
      }
      const existingUsername = await findUserByUsername(userData.username);
      if (existingUsername) {
        res
          .status(400)
          .json({ success: false, message: "Username already exists" });
        return;
      }
      const password_hash = await hashPassword(userData.password);
      const query = `
        INSERT INTO users (username, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [
        userData.username,
        userData.email,
        password_hash,
        userData.first_name,
        userData.last_name,
      ];
      let newUser: User;
      try {
        const result = await pool.query(query, values);
        newUser = result.rows[0];
      } catch (error: any) {
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
          throw new Error(
            "Database connection failed. Please ensure the database is set up and running."
          );
        }
        if (error.code === "28000") {
          throw new Error(
            "Database authentication failed. Please check your database credentials and ensure PostgreSQL is running."
          );
        }
        if (error.code === "23505") {
          if (error.constraint === "users_email_key")
            throw new Error("Email already exists");
          if (error.constraint === "users_username_key")
            throw new Error("Username already exists");
        }
        if (error.code === "42P01") {
          throw new Error(
            "Database table not found. Please run the database schema setup."
          );
        }
        throw error;
      }
      const token = generateToken(newUser);
      const userResponse = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        created_at: newUser.created_at,
      };
      const response: UserRegistrationResponse = {
        success: true,
        message: "User registered successfully",
        user: userResponse,
        token,
      };
      res.status(201).json(response);
    } catch (error: any) {
      if (
        error.message === "Email already exists" ||
        error.message === "Username already exists"
      ) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      if (
        error.message.includes("Database connection failed") ||
        error.message.includes("Database authentication failed") ||
        error.message.includes("Database table not found")
      ) {
        res.status(503).json({ success: false, message: error.message });
        return;
      }
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error during registration",
        });
    }
  }
);

app.post(
  "/api/auth/login",
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password }: LoginRequest = req.body;
      const user = await findUserByEmail(email);
      if (!user) {
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
        return;
      }
      if (!user.is_active) {
        res
          .status(401)
          .json({ success: false, message: "Account is deactivated" });
        return;
      }
      const isPasswordValid = await verifyPassword(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
        return;
      }
      const token = generateToken(user);
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      };
      const response: LoginResponse = {
        success: true,
        message: "Login successful",
        user: userResponse,
        token,
      };
      res.status(200).json(response);
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error during login",
        });
    }
  }
);

app.get(
  "/api/auth/profile",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const user = await findUserById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        email_verified: user.email_verified,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
      const response: ApiResponse = {
        success: true,
        message: "Profile retrieved successfully",
        data: userResponse,
      };
      res.status(200).json(response);
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Global error handler:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
);

app.listen(PORT, () => {
  console.log(`Nexus Backend API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
