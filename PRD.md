# Product Requirements Document
## Code Campus Excellence Tracker

**Version:** 2.0 | **Date:** July 2026 | **Organisation:** Code Campus International | **Status:** Production

---

## 1. Overview

The **Code Campus Excellence Tracker** is a full-stack web application for the Code Campus International bootcamp. It enables admins to manage users, mentors to evaluate students weekly, and students to view their personalised performance dashboards.

The system is fully connected to a PostgreSQL database via a REST API. All data persists across sessions.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + TanStack Start (SSR) + Vite 8 |
| Routing | TanStack Router v1 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 17 |
| Auth | JWT (jsonwebtoken) + bcrypt (12 rounds) |
| Email | Resend |
| Security | helmet + express-rate-limit + CORS |

---

## 3. User Roles

| Role | How Created | Login URL |
|---|---|---|
| **Admin** | Seeded directly into DB | /admin-login |
| **Mentor** | Admin creates via User Management | /mentor-login |
| **Student** | Self-registers OR admin/mentor creates | /login |

---

## 4. Authentication

- JWT stored in localStorage (key: excellence_auth)
- Token contains: userId, role
- All protected routes check token on mount via useEffect
- Unauthenticated users redirected to role-specific login page
- Restricted accounts blocked at login with clear error message
- Strong password enforced: uppercase + lowercase + number + symbol (min 8 chars)
- Password reset via Resend email (1-hour token expiry)

---

## 5. Features by Role

### 5.1 Student
- Self-register with name, email, track, password
- Welcome email sent on registration
- Personal dashboard at /dashboard
- View own scores, charts, mentor feedback, rank, class average comparison
- Forgot/reset password

### 5.2 Mentor
- Login at /mentor-login (no register link)
- Full mentor dashboard with stats and charts
- Create and submit weekly evaluations for students
- View all students and their profiles
- Add students inline (combobox with create option)
- View all mentors (read-only)
- View leaderboard

### 5.3 Admin
- Login at /admin-login (no register link)
- Full mentor dashboard (same design and features as mentor)
- User Management: create mentors + students, delete, restrict/unrestrict, reset passwords
- All emails sent automatically on account creation
- Can do everything a mentor can do

---

## 6. Evaluation System

Students are scored weekly across 7 categories (100 points total):

| Category | Max |
|---|---|
| Attendance and Participation | 25 |
| LinkedIn and X Visibility | 10 |
| Project Milestone | 20 |
| Coding Practice | 20 |
| Collaboration and Teamwork | 10 |
| Learning Logs | 10 |
| Bootcamp Housekeeping | 5 |

Performance levels: Excellent (85+) / Good (70+) / Needs Improvement (50+) / Poor (<50)

Evaluation rules:
- One evaluation per student per week (duplicates blocked)
- Evaluator name pulled from logged-in user's account
- Notes/feedback field included

---

## 7. Pages and Routes

| Route | Access | Purpose |
|---|---|---|
| / | Public | Landing page with features and scoring breakdown |
| /login | Student | Login + link to register |
| /register | Public | Student self-registration |
| /forgot-password | All | Request password reset |
| /reset-password | All | Set new password via token |
| /mentor-login | Mentor | Mentor-specific login |
| /admin-login | Admin | Admin-specific login |
| /mentor | Mentor + Admin | Dashboard: stats, charts, top performers, needs improvement |
| /mentor/evaluate | Mentor + Admin | Weekly evaluation form |
| /mentor/students | Mentor + Admin | Student list with search and add |
| /mentor/students/:id | Mentor + Admin | Student profile with full history |
| /mentor/mentors | Mentor (view) / Admin (manage) | Mentors list |
| /mentor/leaderboard | Mentor + Admin | Rankings (4 tabs) |
| /admin | Admin | Admin dashboard (same as mentor) |
| /admin/manage | Admin | User Management |
| /dashboard | Student | Personal score dashboard |

---

## 8. Email Notifications

| Event | Recipient | Content |
|---|---|---|
| Student self-registers | Student | Welcome + dashboard link |
| Admin creates student | Student | Welcome + login credentials |
| Admin/Mentor adds student | Student | Welcome + login credentials |
| Admin creates mentor | Mentor | Welcome + login credentials |
| Password reset requested | User | Reset link (expires 1 hour) |
| Admin resets password | User | New temporary credentials |

---

## 9. Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 7-day expiry
- Role-based route protection on all routes (frontend + backend)
- Rate limiting: 20 auth requests per 15 minutes per IP
- HTTP security headers via helmet
- CORS locked to frontend URL
- Admin can restrict accounts (blocked at login)
- Backend validates all inputs at route level
- Strong password policy enforced on register and password reset

---

## 10. Tracks Available

Software Engineering, Data Analytics, Cloud Engineering, Digital Marketing,
Cybersecurity Engineering, Artificial Intelligence (AI), Blockchain Engineering,
Project Management, Product Design, Product Management

---

## 11. Bootcamp Info

- Duration: 16 weeks
- Current Week: 4
- Evaluations stored permanently in PostgreSQL

---

## 12. Future Roadmap

| Phase | Feature |
|---|---|
| v2 | Connect to Supabase (change DATABASE_URL only) |
| v2 | Cohort management (multiple bootcamp intakes) |
| v2 | Mentor assigned to specific students |
| v3 | Email/WhatsApp notifications after evaluation |
| v3 | Export evaluations to CSV/PDF |
| v3 | Student peer comparison opt-in |
| v4 | Mobile app |
