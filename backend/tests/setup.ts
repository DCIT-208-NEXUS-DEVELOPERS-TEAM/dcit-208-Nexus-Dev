import dotenv from "dotenv";


dotenv.config({ path: ".env.test" });

process.env.NODE_ENV = "test";
process.env.PORT = "3002"; // Use different port for tests
process.env.DB_HOST = "localhost";
process.env.DB_PORT = "5432";
process.env.DB_NAME = "nexus_test";
process.env.DB_USER = "postgres";
process.env.DB_PASSWORD = "password";
process.env.JWT_SECRET = "test-secret-key";

// Global test setup
beforeAll(() => {
  // Setup test database or mock services
  console.log("Setting up test environment...");
});

afterAll(() => {
  // Cleanup test database or mock services
  console.log("Cleaning up test environment...");
});
