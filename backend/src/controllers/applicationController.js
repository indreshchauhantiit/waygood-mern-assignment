const Application = require("../models/Application");
const Program = require("../models/Program");

const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

const {
  validStatusTransitions,
} = require("../config/constants");

// Get applications
const listApplications = asyncHandler(async (req, res) => {
  const { studentId, status } = req.query;

  const filters = {};

  if (studentId) {
    filters.student = studentId;
  }

  if (status) {
    filters.status = status;
  }

  const applications = await Application.find(filters)
    .populate("student", "fullName email role")
    .populate("program", "title degreeLevel tuitionFeeUsd")
    .populate("university", "name country city")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: applications,
  });
});

// Create application
const createApplication = asyncHandler(async (req, res) => {
  const {
    student,
    program,
    intake,
  } = req.body;

  if (!student || !program || !intake) {
    throw new HttpError(
      400,
      "student, program and intake are required."
    );
  }

  // Check program
  const selectedProgram = await Program.findById(program).lean();

  if (!selectedProgram) {
    throw new HttpError(404, "Program not found.");
  }

  // Check whether requested intake is available
  if (!selectedProgram.intakes.includes(intake)) {
    throw new HttpError(
      400,
      `Intake "${intake}" is not available for this program.`
    );
  }

  // Prevent duplicate application
  const existingApplication = await Application.findOne({
    student,
    program,
    intake,
  });

  if (existingApplication) {
    throw new HttpError(
      409,
      "You have already applied for this program and intake."
    );
  }

  // Create application
  const application = await Application.create({
    student,
    program,
    university: selectedProgram.university,
    destinationCountry: selectedProgram.country,
    intake,
    status: "draft",
    timeline: [
      {
        status: "draft",
        note: "Application created.",
        changedAt: new Date(),
      },
    ],
  });

  const populatedApplication = await Application.findById(
    application._id
  )
    .populate("student", "fullName email role")
    .populate(
      "program",
      "title degreeLevel tuitionFeeUsd intakes"
    )
    .populate("university", "name country city")
    .lean();

  res.status(201).json({
    success: true,
    message: "Application created successfully.",
    data: populatedApplication,
  });
});

// Update application status
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!status) {
    throw new HttpError(400, "New status is required.");
  }

  const application = await Application.findById(id);

  if (!application) {
    throw new HttpError(404, "Application not found.");
  }

  const currentStatus = application.status;

  const allowedTransitions =
    validStatusTransitions[currentStatus] || [];

  // Check valid transition
  if (!allowedTransitions.includes(status)) {
    throw new HttpError(
      400,
      `Invalid status transition: ${currentStatus} -> ${status}.`
    );
  }

  // Update status
  application.status = status;

  // Add status history
  application.timeline.push({
    status,
    note: note || `Application status changed to ${status}.`,
    changedAt: new Date(),
  });

  await application.save();

  const updatedApplication = await Application.findById(
    application._id
  )
    .populate("student", "fullName email role")
    .populate(
      "program",
      "title degreeLevel tuitionFeeUsd intakes"
    )
    .populate("university", "name country city")
    .lean();

  res.json({
    success: true,
    message: "Application status updated successfully.",
    data: updatedApplication,
  });
});

module.exports = {
  createApplication,
  listApplications,
  updateApplicationStatus,
};