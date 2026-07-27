# Product Requirements Document
## Code Campus Excellence Tracker

**Version:** 3.0 | **Date:** July 2026 | **Organisation:** Code Campus International | **Status:** Production

---

## 1. Overview

The **Code Campus Excellence Tracker** is a full-stack web application for the Code Campus International bootcamp. It enables admins and instructors to manage and evaluate students weekly. Students track their progress, self-report weekly activities, message their instructor, and log physical attendance.

---

## 2. Tech Stack

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

## 3. User Roles

| Role (DB) | Display Name | Login URL | After Login |
|---|---|---|---|
| ADMIN | Admin | `/admin-login` | `/admin` |
| MENTOR | Instructor | `/instructor-login` | `/instructor` |
| STUDENT | Student | `/login` | `/student` |

> **Important:** DB enum value is `MENTOR`. Display text is "Instructor" throughout the app.

---

## 4. Authentication & Security

- JWT stored in localStorage (key: `excellence_auth`). Contains `userId` + `role`.
- All protected routes check token on mount. Unauthenticated users redirected to login.
- Restricted accounts (`isActive=false`) blocked at login.
- Strong password policy: uppercase + lowercase + number + symbol, min 8 chars.
- Password reset via Resend email (1-hour token expiry).
- Rate limiting: 20 auth requests per 15 min per IP.
- Cloudinary uploads: API secret stays on backend — clients never see it.
- bcrypt (12 rounds) for all password hashing.

---

## 5. Features by Role

### 5.1 Student
- Self-register (auto-generates CC-YEAR-NNN student code, welcome email sent)
- Student sidebar with 6 sections: Dashboard, Progress, Self-Report, Messages, Attendance, Leaderboard
- View personal scores, charts, instructor feedback, class rank, class average comparison
- Submit weekly self-report: LinkedIn post, learning log, coding activity, event attended (with proof URLs)
- Message track instructor in real-time chat
- Clock In / Clock Out for physical attendance
- Edit profile: name, email, track, profile picture (Cloudinary)
- Change password

### 5.2 Instructor (MENTOR role in DB)
- Full instructor dashboard: stats, charts, top/bottom performers
- Create weekly evaluations (defaults to current cohort week)
- View all students with student codes, tracks, and ranks
- View full student profile: evaluations + self-reports + attendance history
- Verify or Reject student self-reports
- Inbox: chat threads with all students; unread badge per thread
- Settings: set cohort name, start date, total weeks, current week override
- View instructors list + leaderboard

### 5.3 Admin
- Everything an instructor can do (shared /instructor/* routes)
- User Management: create/delete instructors + students, restrict/unrestrict accounts, reset passwords
- Full Settings: all instructor settings + grade threshold configuration
- Audit log: paginated log of all sensitive actions

---

## 6. Evaluation System

Students scored weekly across 7 categories (100 pts total):

| Category | Max |
|---|---|
| Attendance & Participation | 25 |
| LinkedIn & X Visibility | 10 |
| Project Milestone | 20 |
| Coding Practice | 20 |
| Collaboration & Teamwork | 10 |
| Learning Logs | 10 |
| Bootcamp Housekeeping | 5 |

**Performance levels (admin-configurable):** Excellent ≥85 / Good ≥70 / Needs Improvement ≥50 / Poor <50

One evaluation per student per week (duplicates blocked). Evaluator name from logged-in user.

---

## 7. Self-Reporting System

Students submit weekly activity log:
- LinkedIn Post (checkbox + URL)
- Learning Log (checkbox + URL)
- Coding Activity (checkbox + URL)
- Event / Workshop Attended (checkbox + URL)
- Optional notes

Status lifecycle: PENDING → VERIFIED or REJECTED (by instructor/admin).
Editing a submitted report resets status to PENDING.

---

## 8. Messaging System

- Students matched to instructor by `track` field
- Students can only message their track instructor
- Instructors see inbox with all student threads + unread counts
- Messages auto-marked read when thread is opened
- 15-second polling for new messages

---

## 9. Attendance System

- One session per student per day
- Clock In creates record; Clock Out closes it and calculates duration
- Live elapsed timer while clocked in
- Admin/Instructor can view attendance on student detail page
- History shows last 60 records

---

## 10. Dynamic Current Week

The current bootcamp week is never hardcoded:
1. If `current_week_override` is set in settings → use it
2. Else if `cohort_start_date` is set → auto-calculate from start date
3. Else → default to 1

Both ADMIN and MENTOR can update cohort settings (name, start date, total weeks, week override).

---

## 11. Profile Pictures (Cloudinary)

- Upload from Edit Profile page
- File goes to backend → backend signs with Cloudinary API secret → uploads
- Max 5 MB; auto-compressed to ~20–80 KB; cropped to 400×400 face-aware
- URL stored in `users.profile_picture` column
- Shown in sidebar, header, student cards

---

## 12. Student Identity

- Auto-generated ID: `CC-YEAR-NNN` (e.g. `CC-2026-001`)
- Displayed on student dashboard, student list, student detail page
- Unique constraint in DB

---

## 13. Pages and Routes

### Public
`/` · `/login` · `/register` · `/instructor-login` · `/admin-login` · `/forgot-password` · `/reset-password`

### Shared (logged in)
`/change-password` · `/edit-profile`

### Student Sidebar (`/student/*`)
`/student` · `/student/progress` · `/student/self-report` · `/student/messages` · `/student/attendance` · `/student/leaderboard`

### Instructor (`/instructor/*`)
`/instructor` · `/instructor/evaluate` · `/instructor/students` · `/instructor/students/:id` · `/instructor/instructors` · `/instructor/leaderboard` · `/instructor/messages` · `/instructor/settings`

### Admin (`/admin/*`)
`/admin` · `/admin/manage` · `/admin/settings`

---

## 14. Email Notifications

| Event | Recipient |
|---|---|
| Student self-registers | Student (welcome + login link) |
| Admin creates student | Student (welcome + credentials) |
| Admin creates instructor | Instructor (welcome + credentials) |
| Admin resets password | User (new credentials) |
| Evaluation submitted | Student (score summary) |
| Forgot password | User (reset link, 1-hour expiry) |

---

## 15. Tracks (10 available)

Software Engineering, Data Analytics, Cloud Engineering, Digital Marketing,
Cybersecurity Engineering, Artificial Intelligence (AI), Blockchain Engineering,
Project Management, Product Design, Product Management

---

## 16. Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Railway or Render |
| Database | Supabase (change DATABASE_URL only) |
| File Storage | Cloudinary |

**Render Start Command:** `npx prisma migrate deploy && npm run db:seed:prod && npm run start`

---

## 17. Future Roadmap

| Phase | Feature |
|---|---|
| v4 | Real-time WebSocket messaging (replace polling) |
| v4 | Export evaluations to CSV/PDF |
| v4 | Multiple cohort management |
| v5 | Mobile app (React Native) |
| v5 | WhatsApp/SMS notifications |
