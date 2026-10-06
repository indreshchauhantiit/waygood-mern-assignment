const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const connectDatabase = require("../config/database");
const Student = require("../models/Student");

describe("Recommendation API", () => {
  let studentId;

  beforeAll(async () => {
    await connectDatabase();

    const student = await Student.create({
      fullName: "Recommendation Test Student",
      email: `recommend${Date.now()}@example.com`,
      password: "Test@12345",
      role: "student",
      targetCountries: ["Canada"],
      interestedFields: ["Computer Science"],
      preferredIntake: "September",
      maxBudgetUsd: 25000,
      englishTest: {
        exam: "IELTS",
        score: 7,
      },
    });

    studentId = student._id.toString();
  });

  afterAll(async () => {
    await Student.findByIdAndDelete(studentId);
    await mongoose.connection.close();
  });

  test("GET /api/recommendations/:studentId should return recommendations", async () => {
    const response = await request(app)
      .get(`/api/recommendations/${studentId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    // Student information
    expect(response.body.data.student).toBeDefined();
    expect(response.body.data.student.fullName).toBe(
      "Recommendation Test Student"
    );

    // Recommendations array
    expect(response.body.data.recommendations).toBeDefined();
    expect(
      Array.isArray(response.body.data.recommendations)
    ).toBe(true);

    // Meta information
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.count).toBeDefined();
    expect(
      response.body.meta.implementationStatus
    ).toBe("mongodb-aggregation");
  });

  test("Recommendation results should contain match score and reasons", async () => {
    const response = await request(app)
      .get(`/api/recommendations/${studentId}`);

    expect(response.statusCode).toBe(200);

    const recommendations =
      response.body.data.recommendations;

    if (recommendations.length > 0) {
      const recommendation = recommendations[0];

      expect(recommendation.matchScore).toBeDefined();
      expect(typeof recommendation.matchScore).toBe("number");

      expect(recommendation.reasons).toBeDefined();
      expect(Array.isArray(recommendation.reasons)).toBe(true);

      expect(recommendation.title).toBeDefined();
      expect(recommendation.country).toBeDefined();
      expect(recommendation.tuitionFeeUsd).toBeDefined();
    }
  });

  test("Recommendations should be sorted by match score", async () => {
    const response = await request(app)
      .get(`/api/recommendations/${studentId}`);

    expect(response.statusCode).toBe(200);

    const recommendations =
      response.body.data.recommendations;

    for (let i = 1; i < recommendations.length; i++) {
      expect(
        recommendations[i].matchScore
      ).toBeLessThanOrEqual(
        recommendations[i - 1].matchScore
      );
    }
  });

  test("Recommendation API should return 404 for invalid student", async () => {
    const fakeStudentId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .get(`/api/recommendations/${fakeStudentId}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});