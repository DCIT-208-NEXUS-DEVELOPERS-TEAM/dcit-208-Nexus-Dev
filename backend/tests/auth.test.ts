import request from "supertest";
import app from "../src/index";

describe("Authentication Endpoints", () => {
  describe("POST /api/auth/register", () => {
    it("should register a new user with valid data", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "SecurePass123",
        first_name: "Test",
        last_name: "User",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
    });

    it("should return 400 for invalid email", async () => {
      const userData = {
        username: "testuser",
        email: "invalid-email",
        password: "SecurePass123",
        first_name: "Test",
        last_name: "User",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return 400 for weak password", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "weak",
        first_name: "Test",
        last_name: "User",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation failed");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "SecurePass123",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
    });

    it("should return 401 for invalid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid email or password");
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Nexus Backend API is running");
    });
  });
});
