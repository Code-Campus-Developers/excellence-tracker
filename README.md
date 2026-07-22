# Code Campus Excellence Tracker

The official performance tracking platform for **Code Campus International**. Mentors evaluate students weekly across 7 categories. Students view their personal dashboards. Admins manage the entire system.

---

## Project Structure

```
Code-Campus-Excellence-Tracker/
├── tracking_frontend/     # React + TypeScript frontend (TanStack Start)
└── tracking_backend/      # Node.js + Express + Prisma backend
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + TanStack Start (SSR) + Vite 8 |
| Routing | TanStack Router v1 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 17 |
| Auth | JWT + bcrypt (12 rounds) |
| Email | Resend |
| Security | helmet + express-rate-limit + CORS |

---

## User Roles

| Role | Access | Login URL |
|---|---|---|
| **Admin** | Full access, user management, settings, notifications | `/admin-login` |
| **Mentor** | Dashboard, evaluations, students, mentors, leaderboard | `/mentor-login` |
| **Student** | Personal score dashboard, notifications | `/login` |

---

## Pages

| Route | Role | Description |
|---|---|---|
| `/` | Public | Landing page with hero background |
| `/login` | Student | Login + register link |
| `/register` | Public | Student self-registration |
| `/forgot-password` | All | Request password reset |
| `/reset-password` | All | Set new password via token |
| `/change-password` | All (logged in) | Change password |
| `/mentor-login` | Mentor | Mentor login |
| `/admin-login` | Admin | Admin login |
| `/mentor` | Mentor + Admin | Dashboard: stats, charts, top performers |
| `/mentor/evaluate` | Mentor + Admin | Create weekly evaluation |
| `/mentor/students` | Mentor + Admin | Student list with rank column |
| `/mentor/students/:id` | Mentor + Admin | Full student profile |
| `/mentor/mentors` | Mentor (view) / Admin (manage) | Mentors list |
| `/mentor/leaderboard` | Mentor + Admin | Rankings with grading scale |
| `/admin` | Admin | Admin dashboard |
| `/admin/manage` | Admin | User Management |
| `/admin/settings` | Admin | Configure grades, weeks per track, cohort |
| `/dashboard` | Student | Personal score dashboard + class leaderboard |

---

## Getting Started

### Backend

```bash
cd tracking_backend
npm install
cp .env.example .env
psql -U postgres -c "CREATE DATABASE excellence_tracker;"
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Backend runs at **http://localhost:4000**

### Frontend

```bash
cd tracking_frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at **http://localhost:8080**

---

## Default Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@codecampus.ng | Admin@1234 |

---

## Evaluation Categories (100 pts total)

| Category | Max |
|---|---|
| Attendance and Participation | 25 |
| LinkedIn and X Visibility | 10 |
| Project Milestone | 20 |
| Coding Practice | 20 |
| Collaboration and Teamwork | 10 |
| Learning Logs | 10 |
| Bootcamp Housekeeping | 5 |

Grades are admin-configurable. Defaults: Excellent (85+), Good (70+), Needs Improvement (50+), Poor (<50)

---

## Tracks (10 available)

Software Engineering, Data Analytics, Cloud Engineering, Digital Marketing,
Cybersecurity Engineering, Artificial Intelligence (AI), Blockchain Engineering,
Project Management, Product Design, Product Management

---

## Notifications

| Event | Who is notified |
|---|---|
| Evaluation submitted | Student (in-app + email), Admin (in-app) |
| Student self-registers | Admin (in-app) |
| Admin creates mentor | Admin (in-app) |
| Admin or mentor adds student | Admin + All Mentors (in-app) |

---

## Admin Settings (`/admin/settings`)

- Cohort name and start date
- Grade thresholds per level
- Total bootcamp weeks
- Current week per track independently

---

## Security

- bcrypt (12 rounds), JWT (7-day), rate limiting, helmet, CORS
- Role-based protection on all routes (frontend + backend)
- Admin can restrict/unrestrict accounts
- Strong password policy: uppercase + lowercase + number + symbol

The official performance tracking platform for **Code Campus International**. Mentors evaluate students weekly across 7 categories. Students view their personal dashboards. Admins manage the entire system.

---

## Project Structure

```
Code-Campus-Excellence-Tracker/
├── tracking_frontend/     # React + TypeScript frontend (TanStack Start)
└── tracking_backend/      # Node.js + Express + Prisma backend
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 |
| Routing | TanStack Router v1 (SSR) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 17 (local) → Supabase (production) |
| Auth | JWT + bcrypt |
| Email | Resend |
| Security | helmet + express-rate-limit |

---

## User Roles

| Role | Access | Login URL |
|---|---|---|
| **Admin** | Full access — dashboard, evaluations, students, mentors, leaderboard + admin management | `/admin-login` |
| **Mentor** | Dashboard, evaluations, students, mentors list, leaderboard | `/mentor-login` |
| **Student** | Personal dashboard (scores, charts, mentor feedback, rank) | `/login` |

---

## Pages

| Route | Role | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Student | Student login + register link |
| `/register` | Public | Student self-registration |
| `/forgot-password` | All | Request password reset email |
| `/reset-password` | All | Set new password via token |
| `/mentor-login` | Mentor | Mentor login (no register link) |
| `/admin-login` | Admin | Admin login (no register link) |
| `/mentor` | Mentor + Admin | Dashboard — stats, charts, top performers |
| `/mentor/evaluate` | Mentor + Admin | Create weekly evaluation |
| `/mentor/students` | Mentor + Admin | Browse and search all students |
| `/mentor/students/:id` | Mentor + Admin | Full student profile |
| `/mentor/mentors` | Mentor (view) + Admin (manage) | Mentors list |
| `/mentor/leaderboard` | Mentor + Admin | Ranked student performance (4 views) |
| `/admin` | Admin | Admin dashboard (same design as mentor) |
| `/admin/manage` | Admin | Manage mentors + students (restrict, reset, delete) |
| `/dashboard` | Student | Personal score dashboard |

---

## Getting Started

### Backend

```bash
cd tracking_backend
npm install
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, RESEND_API_KEY, FROM_EMAIL
psql -U postgres -c "CREATE DATABASE excellence_tracker;"
npx prisma migrate dev
npm run db:seed
npm run dev
```

Backend runs at **http://localhost:4000**

### Frontend

```bash
cd tracking_frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000
npm run dev
```

Frontend runs at **http://localhost:8080**

---

## Default Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@codecampus.ng | Admin@1234 |

Mentors are created by admin via the admin panel. Students self-register or are added by admin/mentor.

---

## Evaluation Categories (100 pts total)

| Category | Max |
|---|---|
| Attendance & Participation | 25 |
| LinkedIn & X Visibility | 10 |
| Project Milestone | 20 |
| Coding Practice | 20 |
| Collaboration & Teamwork | 10 |
| Learning Logs | 10 |
| Bootcamp Housekeeping | 5 |

**Performance:** Excellent (>=85) / Good (>=70) / Needs Improvement (>=50) / Poor (<50)

---

## Tracks

Software Engineering, Data Analytics, Cloud Engineering, Digital Marketing,
Cybersecurity Engineering, Artificial Intelligence (AI), Blockchain Engineering,
Project Management, Product Design, Product Management

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens (7-day expiry)
- Role-based protection on all routes (frontend + backend)
- Rate limiting on auth endpoints (20 req / 15 min per IP)
- HTTP security headers via helmet
- Admin can restrict or unrestrict any user account
- CORS locked to frontend URL

---

## Admin Capabilities

- Create mentors (welcome email sent automatically)
- Create students (welcome email sent automatically)
- Reset any user's password (new credentials emailed)
- Restrict / unrestrict student or mentor accounts
- Delete students or mentors
- Access full mentor dashboard (evaluate, students, leaderboard)

---

## Bootcamp Info

- Duration: 16 weeks / Current Week: 4
- API Base URL: http://localhost:4000
