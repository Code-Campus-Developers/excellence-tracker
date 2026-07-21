# Product Requirements Document — Backend
## Code Campus Excellence Tracker API

**Version:** 1.0
**Date:** July 2026
**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL

---

## 1. Overview

The backend provides a REST API that the `tracking_frontend` consumes. It manages persistent storage of students and weekly evaluations, replacing the in-memory store in the frontend.

---

## 2. Database Schema

### `students`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Primary key (e.g. `s1`, `s_timestamp`) |
| name | TEXT | Full name |
| email | TEXT | Unique |
| track | TEXT | Frontend / Backend / Fullstack / Data |
| avatar_color | TEXT | Hex color for avatar |
| created_at | TIMESTAMPTZ | Auto |

### `evaluations`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Primary key |
| student_id | TEXT | FK → students.id |
| week | INTEGER | 1–16 |
| evaluator | TEXT | Mentor name |
| scores | JSONB | `{ attendance, linkedin, project, coding, teamwork, learning, housekeeping }` |
| total | INTEGER | Sum of scores |
| notes | TEXT | Mentor feedback |
| created_at | TIMESTAMPTZ | Auto |
| UNIQUE | (student_id, week) | One evaluation per student per week |

---

## 3. API Requirements

### Students
- **B01** — GET all students ordered by name
- **B02** — GET single student by id (404 if not found)
- **B03** — POST create student (validate required fields)
- **B04** — PUT update student fields (partial update supported)
- **B05** — DELETE student (cascades to evaluations)

### Evaluations
- **B06** — GET all evaluations
- **B07** — GET evaluations by student id
- **B08** — GET evaluations by week number
- **B09** — POST create evaluation (409 if duplicate student+week)
- **B10** — DELETE evaluation by id

### General
- **B11** — All routes return JSON
- **B12** — CORS restricted to frontend URL
- **B13** — Global error handler returns `{ error: string }`
- **B14** — Health check endpoint at `/health`

---

## 4. Evaluation Score Categories

```json
{
  "attendance": 25,
  "linkedin": 10,
  "project": 20,
  "coding": 20,
  "teamwork": 10,
  "learning": 10,
  "housekeeping": 5
}
```
Total: **100 points**

---

## 5. Future Roadmap

| Phase | Feature |
|---|---|
| v2 | JWT Authentication (Admin / Mentor / Student roles) |
| v2 | POST /auth/login, POST /auth/register endpoints |
| v2 | Row-level security — students can only GET their own data |
| v3 | Connect to Supabase (change DATABASE_URL only) |
| v3 | Cohorts table — group students by bootcamp intake |
| v3 | Mentor assignment — link mentors to specific students |
