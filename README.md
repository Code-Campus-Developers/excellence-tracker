# Code Campus Excellence Tracker

The official student performance tracking platform for **Code Campus International**. Instructors evaluate students weekly across 7 categories. Students track their progress, self-report activities, message their instructor, and log attendance. Admins and Instructors manage the full system.

---

## Project Structure

```
Code-Campus-Excellence-Tracker/
├── tracking_frontend/     # React + TypeScript + TanStack Start (SSR)
├── tracking_backend/      # Node.js + Express + Prisma + PostgreSQL
└── docker-compose.yml     # Runs both services + PostgreSQL together
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + TanStack Start (SSR) + Vite 8 |
| Routing | TanStack Router v1 (file-based) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| State | React Context (AuthStore + DataStore) |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 17 |
| Auth | JWT (7-day) + bcrypt (12 rounds) |
| Email | Resend |
| File Upload | Cloudinary (signed, server-side) |
| Security | helmet + express-rate-limit + CORS |

---

## User Roles

| Role | Display | Login URL | After login |
|---|---|---|---|
| **ADMIN** | Admin | `/admin-login` | `/admin` |
| **MENTOR** (DB enum) | Instructor | `/instructor-login` | `/instructor` |
| **STUDENT** | Student | `/login` | `/student` |

> The database enum value is `MENTOR`. Display text is "Instructor". Never rename the DB enum.

---

## Pages

### Public
| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Student login + register link |
| `/register` | Student self-registration |
| `/instructor-login` | Instructor login |
| `/admin-login` | Admin login |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password via token |

### Shared (all logged-in roles)
| Route | Description |
|---|---|
| `/change-password` | Change password |
| `/edit-profile` | Edit name, email, track + upload profile picture |

### Student Sidebar (`/student/*`)
| Route | Description |
|---|---|
| `/student` | Dashboard — profile, stats, quick actions |
| `/student/progress` | Score history chart, radar chart, class comparison |
| `/student/self-report` | Weekly self-report: LinkedIn, learning log, coding, event |
| `/student/messages` | Chat with track instructor |
| `/student/attendance` | Clock In / Clock Out + history |
| `/student/leaderboard` | Class leaderboard with medals |

### Instructor (`/instructor/*`)
| Route | Description |
|---|---|
| `/instructor` | Dashboard — stats, charts, top/bottom performers |
| `/instructor/evaluate` | Create weekly evaluation (defaults to current week) |
| `/instructor/students` | All students with rank, track, student code |
| `/instructor/students/:id` | Full student profile + self-reports + attendance |
| `/instructor/instructors` | Instructors list |
| `/instructor/leaderboard` | Class rankings (4 views) |
| `/instructor/messages` | Inbox + chat threads with students |
| `/instructor/settings` | Set cohort info, total weeks, current week override |

### Admin (`/admin/*`)
| Route | Description |
|---|---|
| `/admin` | Admin dashboard |
| `/admin/manage` | User Management + Audit Log |
| `/admin/settings` | Full settings: grades, cohort, weeks, week override |

---

## Getting Started

### Backend

```bash
cd tracking_backend
npm install
cp .env.example .env
# Fill in all values (see Environment Variables section)
psql -U postgres -c "CREATE DATABASE excellence_tracker;"
npx prisma migrate deploy
npm run db:seed        # dev only
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

### Docker

```bash
docker compose up --build
```

---

## Environment Variables

### Backend (`.env`)

```env
PORT=4000
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/excellence_tracker"
FRONTEND_URL=http://localhost:8080
APP_URL=http://localhost:8080
JWT_SECRET=your-64-char-random-secret
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=admin@yourschool.com
ADMIN_PASSWORD=StrongPassword@123

# Cloudinary (signed uploads — get from cloudinary.com > Settings > Access Keys)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:4000
```

---

## Seeding

| Script | Use case | Safe in production? |
|---|---|---|
| `npm run db:seed` | Local dev — wipes everything, creates demo data | Never |
| `npm run db:seed:prod` | Production — creates admin + settings only if absent | Always safe |

**Default dev credentials (after seed):**

| Role | Email | Password |
|---|---|---|
| Admin | value of `ADMIN_EMAIL` (default: `admin@codecampus.ng`) | value of `ADMIN_PASSWORD` (default: `Admin@1234`) |

---

## Features

### Evaluation System
- Weekly scoring across 7 categories (100 pts total)
- Duplicate prevention per student per week
- Instructor notes per evaluation

### Student Self-Reporting
- Students log: LinkedIn post, learning log, coding activity, event attended
- Each with checkbox + proof URL
- Instructor/Admin can Verify or Reject
- Status badges: Pending / Verified / Rejected

### Messaging
- Students message their track instructor (matched by track field)
- Instructor inbox with unread count per thread
- 15-second polling for new messages

### Attendance
- Clock In / Clock Out (one session per day)
- Duration auto-calculated; live elapsed timer while clocked in
- Full history with stats; visible to instructor on student detail page

### Profile & Identity
- Auto-generated Student ID: `CC-YEAR-NNN` (e.g. `CC-2026-001`)
- Profile picture upload via Cloudinary (signed server-side, up to 5 MB, auto-compressed to ~20–80 KB)
- Edit profile: name, email, track, photo

### Dynamic Current Week
- `getCurrentWeek(settings)` auto-calculates from `cohort_start_date`
- Admin or Instructor can override with a manual value in Settings
- Both roles can set cohort name, start date, and total weeks

### Notifications & Audit
- In-app bell with unread count (polls every 60s)
- Email via Resend on evaluation submission
- Audit log for all sensitive actions (admin-only)

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

Performance levels (admin-configurable): Excellent ≥85 / Good ≥70 / Needs Improvement ≥50 / Poor <50

---

## Tracks (10 available)

Software Engineering, Data Analytics, Cloud Engineering, Digital Marketing,
Cybersecurity Engineering, Artificial Intelligence (AI), Blockchain Engineering,
Project Management, Product Design, Product Management

---

## Security

- bcrypt (12 rounds), JWT (7-day), rate limiting (20 req/15 min per IP)
- HTTP security headers via helmet; CORS locked to FRONTEND_URL
- Role-based guards on all backend routes + frontend redirects
- Cloudinary uploads signed server-side — API secret never exposed to browser
- Admin can restrict / unrestrict any user account
- Strong password policy enforced on all password changes

---

## Production Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Railway or Render |
| Database | Supabase (change DATABASE_URL only) |
| Storage | Cloudinary |

**Render Start Command:**
```
npx prisma migrate deploy && npm run db:seed:prod && npm run start
```
