# PRD - tracking_backend
## Code Campus Excellence Tracker API

**Version:** 3.0 | **Date:** July 2026 | **Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL

---

## 1. Overview

The backend is a REST API serving the React frontend. It handles all data persistence, authentication, email notifications, in-app notifications, audit logging, file uploads, messaging, attendance, and self-reporting.

All routes except auth endpoints are protected with JWT middleware.

---

## 2. Database Tables

| Table | Purpose |
|---|---|
| `users` | All accounts: ADMIN, MENTOR (instructor), STUDENT. Stores role, isActive, passwordHash, resetToken, track, profilePicture |
| `students` | Student profiles: name, email, track, avatarColor, studentCode (CC-YEAR-NNN), linked to users via userId |
| `evaluations` | Weekly scores: scores (JSONB), total, week, evaluator, notes. Unique per studentId+week |
| `settings` | Key-value store: grade thresholds, cohort info, total_weeks, track_weeks, current_week_override |
| `notifications` | In-app notifications: userId, message, link, isRead |
| `audit_logs` | Action history: userId, userName, userRole, action, details (JSONB), ipAddress |
| `self_reports` | Weekly student self-reports: LinkedIn, learning log, coding, event. Status: PENDING/VERIFIED/REJECTED |
| `messages` | User-to-user chat: senderId, receiverId, content, isRead |
| `attendance` | Daily clock-in/out: studentId, date (DATE), clockInAt, clockOutAt, durationMin |

---

## 3. Auth Middleware

**`authenticate`** — verifies JWT from `Authorization: Bearer <token>` header. Attaches `req.user = { userId, role }`.

**`authorize(...roles)`** — checks `req.user.role` against allowed roles. Returns 403 if not allowed.

**DB Role enum:** `ADMIN`, `MENTOR`, `STUDENT` — never rename. Display name for MENTOR is "Instructor".

---

## 4. API Routes

### Auth (`/auth/*`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Student self-registration. Auto-generates studentCode CC-YEAR-NNN. Notifies admins. |
| POST | `/auth/login` | Public | Returns JWT + user + student record |
| GET | `/auth/me` | Any | Own profile + student record |
| PUT | `/auth/profile` | Any | Update name, email, track, profilePicture |
| POST | `/auth/change-password` | Any | Change password (validates old password) |
| POST | `/auth/forgot-password` | Public | Sends reset email via Resend |
| POST | `/auth/reset-password` | Public | Set new password via reset token |

### Students (`/api/students`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/students` | Any | All active students |
| POST | `/api/students/enroll` | MENTOR/ADMIN | Enroll student (creates user + student records) |

### Evaluations (`/api/evaluations`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/evaluations` | Any | All evaluations |
| POST | `/api/evaluations` | Any | Create evaluation. Triggers student notification + email + admin notification + audit |
| DELETE | `/api/evaluations/:id` | MENTOR/ADMIN | Delete evaluation |

### Settings (`/api/settings`, `/admin/settings`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/settings` | Any | All settings as key-value |
| GET | `/admin/settings` | ADMIN/MENTOR | Same |
| PUT | `/admin/settings` | ADMIN/MENTOR | Upsert settings. Both admin and instructor can update cohort/week settings |

**Available setting keys:** `grade_excellent`, `grade_good`, `grade_needs`, `total_weeks`, `track_weeks` (JSON), `cohort_name`, `cohort_start_date`, `current_week_override`

### Self-Reports (`/api/self-reports`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/self-reports/me` | STUDENT | Own reports ordered by date desc |
| GET | `/api/self-reports/student/:id` | MENTOR/ADMIN | A student's reports |
| POST | `/api/self-reports` | STUDENT | Submit/update weekly report (upsert). Resets status to PENDING on edit |
| PATCH | `/api/self-reports/:id/verify` | MENTOR/ADMIN | Set status to VERIFIED or REJECTED |

### Messages (`/api/messages`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/messages/instructor` | STUDENT | Find student's track instructor user record |
| GET | `/api/messages/thread/:userId` | Any | Full thread with user. Auto-marks incoming as read |
| GET | `/api/messages/inbox` | MENTOR/ADMIN | Conversation list with unread counts |
| GET | `/api/messages/unread-count` | Any | Quick unread count |
| POST | `/api/messages` | Any | Send message. Students validated to only message their track instructor |

### Attendance (`/api/attendance`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/attendance/today` | STUDENT | Today's record (null if not clocked in) |
| POST | `/api/attendance/clock-in` | STUDENT | Create today's record. Blocks duplicate |
| POST | `/api/attendance/clock-out` | STUDENT | Close today's record, sets durationMin |
| GET | `/api/attendance/me` | STUDENT | Own history (last 60 records) |
| GET | `/api/attendance/student/:id` | MENTOR/ADMIN | A student's history |

### Upload (`/api/upload`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/upload/profile-picture` | Any | Upload image file (max 5 MB, images only). Uploads to Cloudinary signed with API secret. Returns `{ url }`. Auto-crops to 400x400 face-aware, auto-compresses |

### Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Any | Own notifications |
| PUT | `/api/notifications/read-all` | Any | Mark all as read |
| DELETE | `/api/notifications/:id` | Any | Delete one |
| DELETE | `/api/notifications/clear` | Any | Delete all |

### Admin (`/admin/*`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/instructors` | ADMIN | All instructors |
| POST | `/admin/instructors` | ADMIN | Create instructor. Sends welcome email |
| DELETE | `/admin/instructors/:id` | ADMIN | Delete instructor + audit |
| POST | `/admin/students` | ADMIN | Create student with auto studentCode |
| DELETE | `/admin/students/:id` | ADMIN | Delete student + audit |
| PUT | `/admin/users/:id/reset-password` | ADMIN | Reset password, email new credentials |
| PUT | `/admin/users/:id/toggle-active` | ADMIN | Restrict/unrestrict account |
| GET | `/admin/audit-logs` | ADMIN | Paginated (50/page) audit log |

---

## 5. Current Week Logic

The current bootcamp week is dynamic:
1. If `current_week_override` setting is set → use that value
2. Else if `cohort_start_date` is set → auto-calculate: `floor((now - start) / 7) + 1`, clamped to `[1, total_weeks]`
3. Else → 1

Frontend uses `getCurrentWeek(settings)` from `store.tsx`. No hardcoded week values anywhere.

Both ADMIN and MENTOR can update settings (cohort name, start date, total weeks, override).

---

## 6. Email Templates (Resend)

| Function | Trigger | Recipient |
|---|---|---|
| `sendInstructorWelcomeEmail` | Admin creates instructor | New instructor |
| `sendStudentWelcomeEmail` | Admin/mentor creates student | New student |
| `sendPasswordResetEmail` | Forgot password request | Requesting user |
| `sendEvaluationEmail` | Evaluation submitted | Evaluated student |

FROM address: configurable via `FROM_EMAIL` env var (default: `onboarding@resend.dev` for testing).

---

## 7. Student Code Generation

Auto-generated on student creation: `CC-${year}-${padStart(count+1, 3, "0")}`

Examples: `CC-2026-001`, `CC-2026-042`

Guaranteed unique via `@unique` DB constraint. Falls back to retry if race condition occurs.

---

## 8. Security Notes

- Passwords: bcrypt 12 rounds
- JWT: 7-day expiry, contains `{ userId, role }`
- Rate limiting: 20 requests / 15 min per IP on all `/auth/*` routes
- Headers: helmet (CSP, HSTS, X-Frame-Options, etc.)
- CORS: locked to `FRONTEND_URL` env var
- Cloudinary: API secret never sent to client; all uploads go through backend
- Account restriction: `isActive=false` blocks login with 403
- Audit log: written on login, register, evaluation, user create/delete, password change/reset, restrict/unrestrict
