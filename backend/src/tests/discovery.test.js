const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const connectDatabase = require("../config/database");

describe("University & Program Discovery API", () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("GET /api/universities should return universities with pagination", async () => {
    const response = await request(app)
      .get("/api/universities");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);

    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBeDefined();
    expect(response.body.meta.limit).toBeDefined();
    expect(response.body.meta.total).toBeDefined();
    expect(response.body.meta.totalPages).toBeDefined();
  });

  test("GET /api/programs should return programs with pagination", async () => {
    const response = await request(app)
      .get("/api/programs");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);

    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBeDefined();
    expect(response.body.meta.limit).toBeDefined();
    expect(response.body.meta.total).toBeDefined();
    expect(response.body.meta.totalPages).toBeDefined();
  });

  test("GET /api/programs should filter by country", async () => {
    const response = await request(app)
      .get("/api/programs")
      .query({
        country: "Canada",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    response.body.data.forEach((program) => {
      expect(program.country).toBe("Canada");
    });
  });

  test("GET /api/programs should filter by field", async () => {
    const response = await request(app)
      .get("/api/programs")
      .query({
        field: "Computer Science",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    response.body.data.forEach((program) => {
      expect(program.field).toBe("Computer Science");
    });
  });

  test("GET /api/programs should support pagination", async () => {
    const response = await request(app)
      .get("/api/programs")
      .query({
        page: 1,
        limit: 2,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.length).toBeLessThanOrEqual(2);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.limit).toBe(2);
  });

  test("GET /api/programs should support tuition sorting", async () => {
    const response = await request(app)
      .get("/api/programs")
      .query({
        sortBy: "tuitionAsc",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const programs = response.body.data;

    for (let i = 1; i < programs.length; i++) {
      expect(
        programs[i].tuitionFeeUsd
      ).toBeGreaterThanOrEqual(
        programs[i - 1].tuitionFeeUsd
      );
    }
  });
});