const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const connectDatabase = require("../config/database");

const Student = require("../models/Student");
const Program = require("../models/Program");

describe("Application Workflow API", () => {
  let studentId;
  let programId;
  let applicationId;

  beforeAll(async () => {
    await connectDatabase();

    const student = await Student.create({
      fullName: "Application Test Student",
      email: `application${Date.now()}@example.com`,
      password: "Test@12345",
      role: "student",
    });

    studentId = student._id.toString();

    const program = await Program.findOne({
      intakes: "September",
    });

    if (!program) {
      throw new Error(
        "No program with September intake found."
      );
    }

    programId = program._id.toString();
  });

  afterAll(async () => {
    if (applicationId) {
      await mongoose.connection
        .collection("applications")
        .deleteOne({
          _id: new mongoose.Types.ObjectId(applicationId),
        });
    }

    await Student.findByIdAndDelete(studentId);

    await mongoose.connection.close();
  });

  test("POST /api/applications should create an application", async () => {
    const response = await request(app)
      .post("/api/applications")
      .send({
        student: studentId,
        program: programId,
        intake: "September",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toBeDefined();
    expect(response.body.data.status).toBe("draft");

    expect(response.body.data.student).toBeDefined();
    expect(response.body.data.program).toBeDefined();

    expect(response.body.data.timeline).toBeDefined();
    expect(
      Array.isArray(response.body.data.timeline)
    ).toBe(true);

    expect(response.body.data.timeline.length).toBe(1);

    applicationId = response.body.data._id;
  });

  test("POST /api/applications should prevent duplicate application", async () => {
    const response = await request(app)
      .post("/api/applications")
      .send({
        student: studentId,
        program: programId,
        intake: "September",
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test("PATCH /api/applications/:id/status should allow valid transition", async () => {
    const response = await request(app)
      .patch(`/api/applications/${applicationId}/status`)
      .send({
        status: "submitted",
        note: "Application submitted for review.",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.status).toBe("submitted");

    expect(response.body.data.timeline.length).toBe(2);

    expect(
      response.body.data.timeline[1].status
    ).toBe("submitted");
  });

  test("PATCH /api/applications/:id/status should reject invalid transition", async () => {
    const response = await request(app)
      .patch(`/api/applications/${applicationId}/status`)
      .send({
        status: "enrolled",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("GET /api/applications should return applications", async () => {
    const response = await request(app)
      .get("/api/applications")
      .query({
        studentId,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);

    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });
});