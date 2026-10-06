# Waygood Study Abroad Candidate Evaluation

A backend-focused MERN implementation for a study-abroad platform. The project provides authentication, university/program discovery, MongoDB-based recommendations, application workflow management, caching, indexing, and automated API tests.

---

## 1. Project Overview

The platform helps students:

* Discover universities and study programs
* Filter programs based on country, field, intake, degree level, budget, and scholarship availability
* Receive personalized program recommendations
* Apply to programs
* Track application status and history

The backend is built with **Node.js, Express.js, MongoDB, and Mongoose**.

The frontend is a React/Vite application that provides the dashboard shell for consuming the backend APIs.

---

## 2. Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcryptjs
* Jest
* Supertest

### Frontend

* React.js
* Vite

### Performance

* MongoDB indexes
* In-memory TTL cache
* `.lean()` queries
* Parallel database queries using `Promise.all()`

---

## 3. Implemented Requirements

### 3.1 Authentication & Security

Implemented:

* `POST /api/auth/register`
* `POST /api/auth/login`
* `GET /api/auth/me`

Features:

* JWT-based authentication
* Password hashing using bcrypt
* Password validation
* Duplicate email prevention
* Protected `/me` endpoint
* Student and counselor roles
* Consistent API error responses

Example authentication header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Passwords are never returned in API responses.

---

## 4. University & Program Discovery

Implemented discovery APIs for universities and programs.

### University API

```http
GET /api/universities
```

Supports:

* Country filtering
* Search
* Pagination
* Sorting
* Pagination metadata

### Program API

```http
GET /api/programs
```

Supports:

* Country
* Field
* Intake
* Degree level
* Maximum tuition/budget
* Scholarship availability
* Search term
* Pagination
* Sorting

Example:

```http
GET /api/programs?country=Canada&field=Computer%20Science&page=1&limit=10
```

Example response metadata:

```json
{
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "totalPages": 1,
    "cached": false
  }
}
```

The API response structure is designed to remain predictable for frontend consumption.

---

## 5. Recommendation Engine

Implemented:

```http
GET /api/recommendations/:studentId
```

The recommendation engine uses **MongoDB aggregation** rather than calculating recommendations entirely in application-level JavaScript.

The recommendation score considers:

| Factor            |  Weight |
| ----------------- | ------: |
| Preferred country |      35 |
| Interested field  |      30 |
| Budget            |      20 |
| Preferred intake  |      10 |
| IELTS requirement |       5 |
| **Maximum**       | **100** |

Each recommendation contains:

* Program information
* University information
* Match score
* Explanation/reasons for the match

Example:

```json
{
  "matchScore": 100,
  "reasons": [
    "Preferred country match: Canada",
    "Field alignment: Computer Science",
    "Within budget range",
    "Preferred intake available: September",
    "English test score meets requirement"
  ]
}
```

The API also identifies the implementation as:

```json
{
  "implementationStatus": "mongodb-aggregation"
}
```

---

## 6. Application Workflow

Implemented APIs:

```http
POST /api/applications
GET /api/applications
PATCH /api/applications/:id/status
```

### Application Creation

Applications store:

* Student
* Program
* University
* Destination country
* Intake
* Current status
* Timeline/history

Before creating an application, the backend verifies that:

1. The program exists.
2. The requested intake is available.
3. The student has not already applied for the same program and intake.

Duplicate applications return:

```http
409 Conflict
```

---

## 7. Application Status Management

The application workflow uses controlled status transitions.

Current statuses:

```text
draft
submitted
under-review
offer-received
visa-processing
enrolled
rejected
```

Allowed transitions:

```text
draft
  -> submitted

submitted
  -> under-review
  -> rejected

under-review
  -> offer-received
  -> rejected

offer-received
  -> visa-processing
  -> rejected

visa-processing
  -> enrolled
  -> rejected

enrolled
  -> final state

rejected
  -> final state
```

Invalid transitions are rejected by the API.

Every successful status change creates a timeline entry containing:

* Status
* Note
* Timestamp

This provides an audit-style application history.

---

## 8. Caching & Performance

An in-memory TTL cache has been implemented for program discovery responses.

The cache:

* Stores API responses using request-specific cache keys
* Supports configurable TTL
* Automatically expires stale entries
* Avoids unnecessary repeated database queries

Environment variable:

```env
CACHE_TTL_SECONDS=300
```

For example, the first request may return:

```json
"cached": false
```

A repeated identical request can return:

```json
"cached": true
```

### Query Optimization

Program queries use:

```js
.lean()
```

for read-only operations to reduce Mongoose document overhead.

The program list and count queries are executed in parallel using:

```js
Promise.all()
```

This reduces unnecessary sequential database waiting.

---

## 9. MongoDB Indexing

Indexes were added to support important discovery and filtering operations.

### Program Indexes

```js
{
  country: 1,
  degreeLevel: 1,
  field: 1,
  tuitionFeeUsd: 1
}
```

```js
{
  country: 1,
  field: 1,
  tuitionFeeUsd: 1
}
```

```js
{
  country: 1,
  intakes: 1,
  tuitionFeeUsd: 1
}
```

```js
{
  scholarshipAvailable: 1,
  tuitionFeeUsd: 1
}
```

Additional indexes exist on frequently queried fields such as:

* University country
* University popular score
* Program university
* Program country
* Program field
* Program degree level
* Program tuition
* Application student
* Application program
* Application status
* Application country
* Application intake

A unique compound index prevents duplicate applications:

```js
{
  student: 1,
  program: 1,
  intake: 1
}
```

---

## 10. Testing

Automated API tests were added using:

* Jest
* Supertest

Run:

```bash
npm test
```

Current test coverage includes:

### Authentication

* Registration
* Login
* Protected `/me`
* Missing authentication token

### Discovery

* University API
* Program API
* Country filtering
* Field filtering
* Pagination
* Tuition sorting

### Recommendations

* Recommendation generation
* Aggregation implementation
* Match score
* Recommendation reasons
* Invalid student handling

### Applications

* Application creation
* Duplicate application prevention
* Valid status transition
* Invalid status transition
* Application listing

### Current Test Result

```text
Test Suites: 5 passed, 5 total
Tests:       20 passed, 20 total
Snapshots:   0 total
```

---

## 11. Backend Project Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── constants.js
│   │   ├── database.js
│   │   └── env.js
│   │
│   ├── controllers/
│   │   ├── applicationController.js
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── healthController.js
│   │   ├── programController.js
│   │   ├── recommendationController.js
│   │   └── universityController.js
│   │
│   ├── data/
│   │   └── seedData.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   │
│   ├── models/
│   │   ├── Application.js
│   │   ├── Program.js
│   │   ├── Student.js
│   │   └── University.js
│   │
│   ├── routes/
│   │   ├── applicationRoutes.js
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── healthRoutes.js
│   │   ├── programRoutes.js
│   │   ├── recommendationRoutes.js
│   │   └── universityRoutes.js
│   │
│   ├── scripts/
│   │   └── seed.js
│   │
│   ├── services/
│   │   ├── cacheService.js
│   │   └── recommendationService.js
│   │
│   ├── tests/
│   │   ├── application.test.js
│   │   ├── auth.test.js
│   │   ├── discovery.test.js
│   │   ├── health.test.js
│   │   └── recommendation.test.js
│   │
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   └── httpError.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env.example
└── package.json
```

---

## 12. API Endpoints

| Method | Endpoint                          | Purpose                   |
| ------ | --------------------------------- | ------------------------- |
| POST   | `/api/auth/register`              | Register user             |
| POST   | `/api/auth/login`                 | Login                     |
| GET    | `/api/auth/me`                    | Get authenticated user    |
| GET    | `/api/universities`               | Discover universities     |
| GET    | `/api/programs`                   | Discover programs         |
| GET    | `/api/recommendations/:studentId` | Get recommendations       |
| GET    | `/api/applications`               | List applications         |
| POST   | `/api/applications`               | Create application        |
| PATCH  | `/api/applications/:id/status`    | Change application status |
| GET    | `/api/health`                     | Health check              |

---

## 13. Environment Variables

Create:

```text
backend/.env
```

Example:

```env
PORT=4000

MONGODB_URI=mongodb://127.0.0.1:27017/waygood-evaluation

JWT_SECRET=replace-with-a-strong-secret

JWT_EXPIRES_IN=1d

CACHE_TTL_SECONDS=300

REDIS_URL=
```

Do not commit the real `.env` file to GitHub.

Use `.env.example` as the template.

---

## 14. Local Setup

### Prerequisites

Install:

* Node.js
* npm
* MongoDB

### Backend

```bash
cd backend
npm install
```

Create the environment file.

Windows CMD:

```cmd
copy .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Start MongoDB and then seed the database:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

Backend:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server normally runs on:

```text
http://localhost:5173
```

---

## 15. Seeded Data

The seed script provides sample:

* Students
* Counselor
* Universities
* Programs
* Applications

Sample credentials:

```text
aarav@example.com
Candidate123!

sara@example.com
Candidate123!

counselor@example.com
Candidate123!
```

These credentials are intended only for local development/testing.

---

## 16. Example API Flow

### Step 1 — Register/Login

```http
POST /api/auth/login
```

Receive:

```json
{
  "success": true,
  "data": {
    "token": "<JWT_TOKEN>"
  }
}
```

### Step 2 — Access Protected API

```http
GET /api/auth/me
```

Header:

```http
Authorization: Bearer <JWT_TOKEN>
```

### Step 3 — Discover Programs

```http
GET /api/programs?country=Canada&field=Computer%20Science
```

### Step 4 — Get Recommendations

```http
GET /api/recommendations/:studentId
```

### Step 5 — Create Application

```http
POST /api/applications
```

Example:

```json
{
  "student": "<STUDENT_ID>",
  "program": "<PROGRAM_ID>",
  "intake": "September"
}
```

### Step 6 — Update Application Status

```http
PATCH /api/applications/:applicationId/status
```

Example:

```json
{
  "status": "submitted",
  "note": "Student submitted required application documents."
}
```

---

## 17. Engineering Assumptions

### Authentication

JWT is used for stateless API authentication.

Passwords are hashed using bcrypt before being stored.

### Recommendation Scoring

The recommendation score is intentionally explainable rather than using a black-box machine-learning model.

The current scoring model prioritizes:

1. Country
2. Field
3. Budget
4. Intake
5. IELTS requirement

This makes the recommendation result easy to understand and debug.

### Application Status

The starter project provides a richer application lifecycle than a simple Applied/Reviewed/Accepted workflow. The implementation preserves the project's existing status terminology:

```text
draft → submitted → under-review → offer-received → visa-processing → enrolled
```

Rejection can occur from the applicable review stages.

### Caching

The current implementation uses an in-memory cache to keep the project simple and runnable without an additional infrastructure dependency.

For a horizontally scaled production deployment, Redis would be preferable because multiple backend instances would need to share cached data.

---

## 18. Production Improvements

The current implementation is designed for the assignment and local evaluation.

For a production system, the following could be added:

* Redis-based distributed caching
* Rate limiting
* Request logging
* Role-based authorization middleware
* Stronger request validation using a schema validation library
* Refresh tokens
* Token revocation strategy
* API versioning
* Centralized observability
* More comprehensive integration tests
* Database transactions for multi-step workflows
* Background jobs for notifications
* Production-grade pagination for very large datasets
* CI/CD pipeline
* Docker deployment

---

## 19. Bonus Features

The assignment also mentions optional features such as:

* AI study-plan recommendations
* SOP assistance
* Dockerization
* React dashboard improvements
* Rate limiting
* Advanced security

These were treated as optional and were not required for the core backend implementation.

---

## 20. Final Implementation Summary

The completed implementation focuses on the assignment's core evaluation areas:

* Secure JWT authentication
* Password hashing
* Protected APIs
* Student/counselor roles
* Advanced university/program discovery
* Pagination and sorting
* MongoDB aggregation recommendations
* Explainable recommendation scoring
* Application workflow
* Duplicate application prevention
* Status transition validation
* Application timeline/history
* In-memory caching
* MongoDB indexes
* Optimized read queries
* Automated API tests
* Developer documentation

The implementation favors simple, explainable engineering decisions that can be extended toward a production architecture without introducing unnecessary complexity.
