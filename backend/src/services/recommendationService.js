const Program = require("../models/Program");
const Student = require("../models/Student");
const HttpError = require("../utils/httpError");

async function buildProgramRecommendations(studentId) {
  const student = await Student.findById(studentId).lean();

  if (!student) {
    throw new HttpError(404, "Student not found.");
  }

  const targetCountries = student.targetCountries || [];
  const interestedFields = student.interestedFields || [];
  const preferredIntake = student.preferredIntake || "";
  const maxBudgetUsd = Number(student.maxBudgetUsd) || 0;
  const ieltsScore = Number(student.englishTest?.score) || 0;

  const recommendations = await Program.aggregate([
    // 1. Candidate programs based on preferred countries
    {
      $match: {
        country: {
          $in: targetCountries,
        },
      },
    },

    // 2. Calculate individual scores
    {
      $addFields: {
        countryScore: {
          $cond: [
            {
              $in: ["$country", targetCountries],
            },
            35,
            0,
          ],
        },

        fieldMatchCount: {
          $size: {
            $filter: {
              input: interestedFields,
              as: "field",
              cond: {
                $gte: [
                  {
                    $indexOfCP: [
                      {
                        $toLower: "$field",
                      },
                      {
                        $toLower: "$$field",
                      },
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },

        budgetScore: {
          $cond: [
            {
              $and: [
                {
                  $gt: [maxBudgetUsd, 0],
                },
                {
                  $gte: [
                    maxBudgetUsd,
                    "$tuitionFeeUsd",
                  ],
                },
              ],
            },
            20,
            0,
          ],
        },

        intakeScore: {
          $cond: [
            {
              $and: [
                {
                  $ne: [preferredIntake, ""],
                },
                {
                  $in: [
                    preferredIntake,
                    "$intakes",
                  ],
                },
              ],
            },
            10,
            0,
          ],
        },

        ieltsMatchScore: {
          $cond: [
            {
              $gte: [
                ieltsScore,
                "$minimumIelts",
              ],
            },
            5,
            0,
          ],
        },
      },
    },

    // 3. Field score
    {
      $addFields: {
        fieldScore: {
          $cond: [
            {
              $gt: ["$fieldMatchCount", 0],
            },
            30,
            0,
          ],
        },
      },
    },

    // 4. Final recommendation score
    {
      $addFields: {
        matchScore: {
          $add: [
            "$countryScore",
            "$fieldScore",
            "$budgetScore",
            "$intakeScore",
            "$ieltsMatchScore",
          ],
        },

        reasons: {
          $concatArrays: [
            {
              $cond: [
                {
                  $gt: ["$countryScore", 0],
                },
                [
                  {
                    $concat: [
                      "Preferred country match: ",
                      "$country",
                    ],
                  },
                ],
                [],
              ],
            },

            {
              $cond: [
                {
                  $gt: ["$fieldScore", 0],
                },
                [
                  {
                    $concat: [
                      "Field alignment: ",
                      "$field",
                    ],
                  },
                ],
                [],
              ],
            },

            {
              $cond: [
                {
                  $gt: ["$budgetScore", 0],
                },
                ["Within budget range"],
                [],
              ],
            },

            {
              $cond: [
                {
                  $gt: ["$intakeScore", 0],
                },
                [
                  {
                    $concat: [
                      "Preferred intake available: ",
                      preferredIntake,
                    ],
                  },
                ],
                [],
              ],
            },

            {
              $cond: [
                {
                  $gt: ["$ieltsMatchScore", 0],
                },
                ["English test score meets requirement"],
                [],
              ],
            },
          ],
        },
      },
    },

    // 5. Highest score first
    {
      $sort: {
        matchScore: -1,
        tuitionFeeUsd: 1,
      },
    },

    // 6. Return top 5 recommendations
    {
      $limit: 5,
    },

    // 7. Return only required fields
    {
      $project: {
        _id: 1,
        university: 1,
        universityName: 1,
        country: 1,
        city: 1,
        title: 1,
        field: 1,
        degreeLevel: 1,
        tuitionFeeUsd: 1,
        intakes: 1,
        durationMonths: 1,
        minimumIelts: 1,
        scholarshipAvailable: 1,
        stem: 1,
        matchScore: 1,
        reasons: 1,
      },
    },
  ]);

  return {
    data: {
      student: {
        id: student._id,
        fullName: student.fullName,
        targetCountries,
        interestedFields,
        preferredIntake,
        maxBudgetUsd,
        englishTest: student.englishTest || null,
      },

      recommendations,
    },

    meta: {
      count: recommendations.length,
      implementationStatus: "mongodb-aggregation",
    },
  };
}

module.exports = {
  buildProgramRecommendations,
};