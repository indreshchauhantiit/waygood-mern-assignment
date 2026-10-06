const jwt = require("jsonwebtoken");

const env = require("../config/env");
const Student = require("../models/Student");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

function generateToken(student) {
  return jwt.sign(
    {
      sub: student._id.toString(),
      role: student.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
}

const register = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    role,
    targetCountries,
    interestedFields,
    preferredIntake,
    maxBudgetUsd,
    englishTest,
  } = req.body;

  if (!fullName || !email || !password) {
    throw new HttpError(
      400,
      "fullName, email and password are required."
    );
  }

  if (password.length < 8) {
    throw new HttpError(
      400,
      "Password must be at least 8 characters long."
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingStudent = await Student.findOne({
    email: normalizedEmail,
  });

  if (existingStudent) {
    throw new HttpError(409, "Email is already registered.");
  }

  const student = await Student.create({
    fullName,
    email: normalizedEmail,
    password,
    role,
    targetCountries,
    interestedFields,
    preferredIntake,
    maxBudgetUsd,
    englishTest,
  });

  const token = generateToken(student);

  res.status(201).json({
    success: true,
    message: "Registration successful.",
    data: {
      token,
      user: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        role: student.role,
        profileComplete: student.profileComplete,
      },
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new HttpError(
      400,
      "Email and password are required."
    );
  }

  const student = await Student.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!student) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const isPasswordValid = await student.comparePassword(password);

  if (!isPasswordValid) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const token = generateToken(student);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      token,
      user: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        role: student.role,
        profileComplete: student.profileComplete,
      },
    },
  });
});

const me = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user._id).select(
    "-password"
  );

  if (!student) {
    throw new HttpError(404, "User not found.");
  }

  res.status(200).json({
    success: true,
    data: {
      user: student,
    },
  });
});

module.exports = {
  register,
  login,
  me,
};