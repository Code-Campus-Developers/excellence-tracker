# PRD - tracking_backend
## Code Campus Excellence Tracker API

**Version:** 2.1 | **Date:** July 2026 | **Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL

---

## 1. Overview

The backend is a REST API serving the frontend. It handles all data persistence, authentication, email notifications, and in-app notifications. All routes are protected with JWT middleware.

---

## 2. Database Tables

| Table | Purpose |
|---|---|
| users | All accounts: admin, mentors, students. Stores role, isActive, passwordHash, resetToken |
| students | Student profiles: name, email, track, avatarColor, linked to users |
| evaluations | Weekly scores: scores (JSONB), total, week, evaluator, notes |
| settings | Key-value config: grade thresholds, weeks, cohort info |
| notifications | In-app notifications: userId, message, link, isRead |

---

## 3. API Endpoints

### Auth (/auth) - no token required
- POST /auth/register - Student self-registration + welcome email + notify admins
- POST /auth/login - Login all roles, returns JWT. Checks isActive.
- GET /auth/me - Get current user profile (token required)
- POST /auth/forgot-password - Send password reset email
- POST /auth/reset-password - Set new password via token
- POST /auth/change-password - Change password with current password (token required)

### Students (/api/students) - token required
- GET /api/students - List all
- GET /api/students/:id - Get one
- POST /api/students - Create record
- PUT /api/students/:id - Update
- DELETE /api/students/:id - Delete
- POST /api/students/enroll - Create with user account + email + notify admins and mentors (MENTOR or ADMIN)

### Evaluations (/api/evaluations) - token required
- GET /api/evaluations - All evaluations
- GET /api/evaluations/student/:id - By student
- GET /api/evaluations/week/:week - By week
- POST /api/evaluations - Create, triggers student notification + email + admin notification
- DELETE /api/evaluations/:id - Delete

### Notifications (/api/notifications) - token required
- GET /api/notifications - Last 20 for current user
- PUT /api/notifications/read-all - Mark all read
- DELETE /api/notifications/clear - Delete all
- DELETE /api/notifications/:id - Delete one

### Settings (/api/settings) - token required
- GET /api/settings - All settings as key-value

### Mentors (/api/mentors) - token required
- GET /api/mentors - Active mentors list (MENTOR or ADMIN)

### Admin (/admin) - ADMIN role only
- GET /admin/mentors, POST, DELETE /admin/mentors/:id
- GET /admin/students, POST, DELETE /admin/students/:id
- GET /admin/users - All users with roles and isActive
- POST /admin/users/:id/reset-password - Reset + email
- POST /admin/users/:id/toggle-active - Restrict or unrestrict
- GET /admin/settings, PUT /admin/settings

---

## 4. Notification Triggers

| Event | Recipients |
|---|---|
| Evaluation submitted | Student (in-app + email), all Admins (in-app) |
| Student self-registers | All Admins (in-app) |
| Admin creates mentor | All Admins (in-app) |
| Admin or Mentor adds student | All Admins + All Mentors (in-app) |

---

## 5. Settings Keys

| Key | Default | Description |
|---|---|---|
| grade_excellent | 85 | Min score for Excellent |
| grade_good | 70 | Min score for Good |
| grade_needs | 50 | Min score for Needs Improvement |
| total_weeks | 16 | Total bootcamp duration |
| track_weeks | JSON object | Current week per track (10 tracks) |
| cohort_name | Cohort 1 | Display name |
| cohort_start_date | (empty) | Optional start date |

---

## 6. Security

- bcrypt (12 rounds), JWT (7-day), rate limiting (20 req/15 min), helmet, CORS
- isActive check on login (restricted users get 403)
- Strong password: uppercase + lowercase + number + symbol

---

## 7. Scripts

| Script | Purpose |
|---|---|
| npm run dev | Start with hot reload |
| npm run db:migrate | Run Prisma migrations |
| npm run db:generate | Regenerate Prisma client |
| npm run db:studio | Open Prisma Studio |
| npm run db:seed | Seed DB: admin + 8 students + 26 evaluations + default settings |

---

## 8. Moving to Supabase

Change only DATABASE_URL in .env to Supabase connection string. No code changes needed.

**Version:** 2.0 | **Date:** July 2026 | **Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL

---

## 1. Overview

The backend is a REST API that serves the frontend. It manages all persistent data: users (admin, mentors, students), student profiles, weekly evaluations, and authentication. It connects to PostgreSQL via Prisma ORM.

---

## 2. Database Schema

### users table
| Column | Type | Notes |
|---|---|---|
| id | TEXT (cuid) | Primary key |
| name | TEXT | Full name |
| email | TEXT | Unique |
| password_hash | TEXT | bcrypt 12 rounds |
| role | ENUM | ADMIN / MENTOR / STUDENT |
| is_active | BOOLEAN | Default true. False = restricted |
| reset_token | TEXT | Nullable, for password reset |
| reset_expires | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | Auto |

### students table
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Primary key |
| name | TEXT | |
| email | TEXT | Unique |
| track | TEXT | One of 10 tracks |
| avatar_color | TEXT | Hex colour |
| user_id | TEXT | FK to users.id (nullable) |
| created_at | TIMESTAMPTZ | Auto |

### evaluations table
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Primary key |
| student_id | TEXT | FK to students.id (cascade delete) |
| week | INTEGER | 1-16 |
| evaluator | TEXT | Mentor name from JWT |
| scores | JSONB | {attendance, linkedin, project, coding, teamwork, learning, housekeeping} |
| total | INTEGER | Sum of scores |
| notes | TEXT | Mentor feedback |
| created_at | TIMESTAMPTZ | Auto |
| UNIQUE | (student_id, week) | One eval per student per week |

---

## 3. API Endpoints

### Auth (no auth required)
- POST /auth/register - Student self-registration
- POST /auth/login - Login all roles, returns JWT
- GET /auth/me - Get current user (auth required)
- POST /auth/forgot-password - Send reset email
- POST /auth/reset-password - Set new password via token

### Students (auth required)
- GET /api/students - List all students
- GET /api/students/:id - Get one student
- POST /api/students - Create student record
- PUT /api/students/:id - Update student
- DELETE /api/students/:id - Delete student
- POST /api/students/enroll - Create student with user account + email (MENTOR or ADMIN)

### Evaluations (auth required)
- GET /api/evaluations - All evaluations
- GET /api/evaluations/student/:id - By student
- GET /api/evaluations/week/:week - By week
- POST /api/evaluations - Create evaluation
- DELETE /api/evaluations/:id - Delete evaluation

### Admin (ADMIN role only)
- GET /admin/mentors - List all mentors
- POST /admin/mentors - Create mentor + send welcome email
- DELETE /admin/mentors/:id - Delete mentor
- GET /admin/students - All students with eval counts
- POST /admin/students - Create student + send welcome email
- DELETE /admin/students/:id - Delete student
- GET /admin/users - All users with roles and isActive status
- POST /admin/users/:id/reset-password - Reset password + email new credentials
- POST /admin/users/:id/toggle-active - Restrict or unrestrict account

---

## 4. Security

- authenticate middleware: validates JWT on every protected route
- authorize middleware: checks role (ADMIN, MENTOR, STUDENT)
- Rate limiting on /auth/* (20 requests per 15 min per IP)
- helmet for HTTP security headers
- CORS locked to FRONTEND_URL env variable
- isActive check on login (restricted users get 403)
- Strong password regex enforced on register: uppercase + lowercase + number + symbol

---

## 5. Email (Resend)

| Trigger | Template |
|---|---|
| Student self-registers | Welcome email with dashboard link |
| Admin/Mentor creates student | Welcome + temporary credentials |
| Admin creates mentor | Welcome + temporary credentials |
| Password reset requested | Reset link (1 hour expiry) |
| Admin resets a user password | New temporary credentials |

FROM address: configured via FROM_EMAIL env var (default: onboarding@resend.dev for testing)

---

## 6. Environment Variables

```
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/excellence_tracker
FRONTEND_URL=http://localhost:8080
APP_URL=http://localhost:8080
JWT_SECRET=your-secret-key
RESEND_API_KEY=re_your_key
FROM_EMAIL=onboarding@resend.dev
```

---

## 7. Scripts

| Script | Purpose |
|---|---|
| npm run dev | Start dev server with hot reload |
| npm run build | Compile TypeScript |
| npm run start | Run compiled build |
| npm run db:migrate | Run Prisma migrations |
| npm run db:generate | Regenerate Prisma client |
| npm run db:studio | Open Prisma Studio |
| npm run db:seed | Seed DB with admin + 8 students + 26 evaluations |

---

## 8. Moving to Supabase

Change only DATABASE_URL in .env to Supabase connection string. No code changes needed.
