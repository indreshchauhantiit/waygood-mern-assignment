const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const connectDatabase = require("../config/database");

describe("Authentication API", () => {
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = "Test@12345";

  let token;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("POST /api/auth/register should create a user", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Test Student",
        email: testEmail,
        password: testPassword,
        role: "student",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.email).toBe(testEmail);
  });

  test("POST /api/auth/login should login successfully", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();

    token = response.body.data.token;
  });

  test("GET /api/auth/me should return authenticated user", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(testEmail);
  });

  test("GET /api/auth/me should reject request without token", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });
});