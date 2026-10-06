const Program = require("../models/Program");

const asyncHandler = require("../utils/asyncHandler");
const cacheService = require("../services/cacheService");

function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

const listPrograms = asyncHandler(async (req, res) => {
  const {
    country,
    degreeLevel,
    intake,
    field,
    q,
    maxTuition,
    scholarshipAvailable,
    sortBy = "relevance",
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {};

  if (country) {
    filters.country = country;
  }

  if (degreeLevel) {
    filters.degreeLevel = degreeLevel;
  }

  if (field) {
    filters.field = field;
  }

  if (intake) {
    filters.intakes = intake;
  }

  if (maxTuition) {
    const tuition = Number(maxTuition);

    if (!Number.isNaN(tuition)) {
      filters.tuitionFeeUsd = { $lte: tuition };
    }
  }

  const scholarshipFlag = parseBoolean(scholarshipAvailable);

  if (typeof scholarshipFlag === "boolean") {
    filters.scholarshipAvailable = scholarshipFlag;
  }

  if (q) {
    filters.$or = [
      { title: { $regex: q, $options: "i" } },
      { universityName: { $regex: q, $options: "i" } },
      { field: { $regex: q, $options: "i" } },
    ];
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(limit) || 10, 1),
    50
  );

  const sortMap = {
    tuitionAsc: { tuitionFeeUsd: 1 },
    tuitionDesc: { tuitionFeeUsd: -1 },
    relevance: {
      scholarshipAvailable: -1,
      tuitionFeeUsd: 1,
    },
  };

  const sort = sortMap[sortBy] || sortMap.relevance;

  // Create unique cache key from request parameters
  const cacheKey = `programs:${JSON.stringify({
    country,
    degreeLevel,
    intake,
    field,
    q,
    maxTuition,
    scholarshipAvailable,
    sortBy,
    pageNumber,
    pageSize,
  })}`;

  // Check cache
  const cachedResult = cacheService.get(cacheKey);

  if (cachedResult) {
    return res.json({
      ...cachedResult,
      meta: {
        ...cachedResult.meta,
        cached: true,
      },
    });
  }

  // Database query
  const [items, total] = await Promise.all([
    Program.find(filters)
      .sort(sort)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Program.countDocuments(filters),
  ]);

  const response = {
    success: true,
    data: items,
    meta: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      cached: false,
    },
  };

  // Store response in cache
  cacheService.set(cacheKey, response);

  res.json(response);
});

module.exports = {
  listPrograms,
};