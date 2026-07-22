# PRD - tracking_frontend
## Code Campus Excellence Tracker Frontend

**Version:** 2.2 | **Date:** July 2026 | **Stack:** React 19 + TypeScript + TanStack Start + Tailwind CSS

---

## 1. Overview

The frontend is a server-side rendered React app. All data is fetched from the backend REST API. Authentication is JWT-based (localStorage). Settings (grades, weeks, cohort) are fetched from API and stored in the DataStore.

---

## 2. Auth Flow

- JWT stored in localStorage under key `excellence_auth`
- On login: token saved, store fetches students + evaluations + settings
- On logout: redirected to role-specific login (mentor → /mentor-login, admin → /admin-login, student → /login)
- Protected routes use `useEffect` auth guards

---

## 3. State Management

| Store | Purpose |
|---|---|
| AuthStore | JWT, user, student from localStorage |
| DataStore | students, evaluations, settings from API |

DataStore fetches on login: GET /api/students, /api/evaluations, /api/settings

---

## 4. Pages

### Public
- `/` - Landing page: hero with background image, sticky nav, features, scoring, grading scale, CTA
- `/login` - Student login + register link, eye toggle
- `/register` - Name, email, track (10 options), strong password + hint
- `/forgot-password` - Email + sends reset link
- `/reset-password` - New password + confirm via token
- `/mentor-login` - Mentor only login
- `/admin-login` - Admin only login

### All Logged-In
- `/change-password` - Current + new + confirm. Strong password enforced.

### Student (STUDENT role)
- `/dashboard` - Fetches own data from API directly:
  - Profile: name, track, rank, badge
  - 4 stat cards, score vs class average
  - Score history + radar chart
  - Latest category breakdown + mentor feedback
  - All weekly scores history
  - Class Leaderboard (top 10, own row highlighted)
  - Grading Scale legend
  - Bell notifications (delete/clear all)
  - Change password icon

### Mentor + Admin
- `/mentor` - Dashboard: stats, charts (live data from store), grading scale
- `/mentor/evaluate` - Evaluation form: searchable combobox, inline create, week selector, categories, notes
- `/mentor/students` - Student list: search, rank column, Add Student button, pagination (20/page)
- `/mentor/students/:id` - Student profile: charts, history, Student View button
- `/mentor/mentors` - Mentor list. Admin: add/reset/delete. Mentor: view.
- `/mentor/leaderboard` - 4 tabs with pagination (20/page) + grading scale

### Admin Only
- `/admin` - Admin dashboard (same design as mentor)
- `/admin/manage` - User Management:
  - Mentors tab: add (sends email), reset password, restrict/unrestrict, delete
  - Students tab: add (sends email), reset password, restrict/unrestrict, delete, pagination (20/page)
  - Audit Log tab: full action history with pagination (50/page)
- `/admin/settings`:
  - Cohort name + start date
  - Grade thresholds (Excellent/Good/Needs Improvement)
  - Total weeks
  - Current week per track (10 tracks, independent)

---

## 5. Notifications

Bell icon in all dashboards:
- Red badge shows unread count
- Dropdown with list of notifications
- Hover to reveal delete (x) button
- "Clear all" button
- Marks all read on open
- Polls every 60 seconds

---

## 6. Components

- `AppShell` - Sidebar: Code Campus logo, dynamic nav (admin sees User Management + Settings), cohort name + week from settings, notification bell (dropdown), user name, change password icon, logout
- `GradingScale` - Uses live grade thresholds from DataStore settings
- `PerfBadge` - Uses live grade thresholds from DataStore settings
- `Pagination` - Reusable numbered pages component
- `Avatar` - Initials-based coloured circle

---

## 7. Sidebar Navigation

| Item | Mentor | Admin |
|---|---|---|
| Dashboard | /mentor | /admin |
| New Evaluation | /mentor/evaluate | /mentor/evaluate |
| Students | /mentor/students | /mentor/students |
| Mentors | /mentor/mentors | /mentor/mentors |
| Leaderboard | /mentor/leaderboard | /mentor/leaderboard |
| User Management | - | /admin/manage |
| Settings | - | /admin/settings |

---

## 8. Environment Variables

```
VITE_API_URL=http://localhost:4000
```

**Version:** 2.1 | **Date:** July 2026 | **Stack:** React 19 + TypeScript + TanStack Start + Tailwind CSS

---

## 1. Overview

The frontend is a server-side rendered React application. All data is fetched from the backend REST API. No hardcoded or in-memory data is used in production. Authentication is JWT-based, stored in localStorage.

---

## 2. Auth Flow

- JWT stored in localStorage under key `excellence_auth`
- On login: token saved, store fetches students + evaluations + settings from API
- Protected routes use `useEffect` auth guards (SSR-safe)
- Role-based redirects: Admin → /admin, Mentor → /mentor, Student → /dashboard
- On logout: redirected to role-specific login page (admin → /admin-login, mentor → /mentor-login, student → /login)

---

## 3. State Management

| Store | Purpose |
|---|---|
| AuthStore (React Context) | JWT, user, student profile |
| DataStore (React Context) | students, evaluations, settings fetched from API |

DataStore fetches on login:
- GET /api/students
- GET /api/evaluations
- GET /api/settings

---

## 4. Pages and Routes

### Public
- `/` - Landing page: hero with background image, sticky navbar, features, scoring breakdown, grading scale, CTA
- `/login` - Student login, eye toggle, field validation, register link
- `/register` - Registration: name, email, track (10 options), strong password with strength hint
- `/forgot-password` - Email field, sends reset link
- `/reset-password` - New password + confirm, reads token from URL
- `/mentor-login` - Mentor login, no register link
- `/admin-login` - Admin login, no register link

### All Logged-In Users
- `/change-password` - Current password + new password + confirm, strong password enforced

### Student (STUDENT role)
- `/dashboard` - Fetches own data directly from API:
  - Profile: name, track, rank, performance badge
  - 4 stat cards: current week, average, best score, trend
  - Score vs class average comparison bar
  - Score history line chart
  - Radar chart for latest category mix
  - Latest category breakdown with mentor feedback
  - All weekly scores history
  - Class Leaderboard (top 10, own row highlighted)
  - Grading Scale legend
  - Bell notification icon with dropdown (delete/clear all)
  - Change password icon link

### Mentor + Admin (MENTOR or ADMIN role)
- `/mentor` - Dashboard: stats, weekly trend, category bar chart, top 5, needs improvement, grading scale
- `/mentor/evaluate` - Evaluation form: searchable combobox, create inline, week selector (1-total), 7 categories, live total, notes, save to API
- `/mentor/students` - Student list: search, add student button, rank column
- `/mentor/students/:id` - Student profile: charts, eval history, Student View button
- `/mentor/mentors` - Mentor list. Admin: add/reset/delete. Mentor: view only
- `/mentor/leaderboard` - 4 tabs with grading scale legend

### Admin Only (ADMIN role)
- `/admin` - Same dashboard as mentor, admin's name shown
- `/admin/manage` - User Management: create mentors/students, restrict/unrestrict, reset passwords, delete
- `/admin/settings` - Settings:
  - Cohort name and start date
  - Grade thresholds (Excellent/Good/Needs Improvement min scores)
  - Total weeks
  - Current week per track (10 tracks, each independent)

---

## 5. Notifications

Bell icon in all dashboards (mentor/admin header + student header):
- Shows unread count badge (red)
- Opens dropdown with notification list
- Hover to reveal delete (x) button on each item
- "Clear all" button at top
- Auto-polls every 60 seconds
- Marks all as read when opened

---

## 6. Shared Components

- `AppShell` - Sidebar with Code Campus logo, dynamic nav (admin sees User Management + Settings extra), cohort name + week in sidebar, notification bell, user name/role, change password icon, logout
- `PageHeader` - Title, subtitle, optional action buttons
- `PerfBadge` - Uses live grade thresholds from settings store
- `Avatar` - Initials-based coloured circle
- `GradingScale` - Shows all 4 levels with score ranges, uses live settings

---

## 7. Sidebar Navigation

| Item | Mentor | Admin |
|---|---|---|
| Dashboard | /mentor | /admin |
| New Evaluation | /mentor/evaluate | /mentor/evaluate |
| Students | /mentor/students | /mentor/students |
| Mentors | /mentor/mentors | /mentor/mentors |
| Leaderboard | /mentor/leaderboard | /mentor/leaderboard |
| User Management | - | /admin/manage |
| Settings | - | /admin/settings |

---

## 8. Environment Variables

```
VITE_API_URL=http://localhost:4000
```

**Version:** 2.0 | **Date:** July 2026 | **Stack:** React 19 + TypeScript + TanStack Start + Tailwind CSS

---

## 1. Overview

The frontend is a server-side rendered React app that communicates with the backend REST API for all data. No in-memory or static data is used. All evaluations, students, and users are fetched from and persisted to PostgreSQL via the API.

---

## 2. Auth Flow

- JWT stored in localStorage under key excellence_auth
- On login: token + user + student saved, store refreshed from API
- Protected routes check auth in useEffect (client-side only, SSR-safe)
- Role-based redirects: Admin → /admin, Mentor → /mentor, Student → /dashboard
- Unauthenticated users redirected to role-specific login page

---

## 3. State Management

| Store | Purpose |
|---|---|
| AuthStore (React Context) | JWT, user, student - from localStorage |
| DataStore (React Context) | students and evaluations arrays - fetched from API on login |

DataStore calls:
- GET /api/students on login
- GET /api/evaluations on login
- POST /api/evaluations when saving evaluation
- POST /api/students/enroll when creating a student from combobox

---

## 4. Pages

### Public
- / - Landing page: logo, tagline, features, scoring breakdown, CTA
- /login - Student login with register link, eye toggle, field validation
- /register - Student registration: name, email, track (10 options), password with strength hint
- /forgot-password - Email field, sends reset link via API
- /reset-password - New password + confirm, reads token from URL
- /mentor-login - Mentor-specific login, no register link
- /admin-login - Admin-specific login, no register link

### Student (Protected - STUDENT role)
- /dashboard - Fetches own data directly from API on mount
  - Profile: name, track, rank, performance badge
  - 4 stat cards: current week, average, best score, trend
  - Score vs class average comparison
  - Score history line chart
  - Radar chart for latest category mix
  - Latest category breakdown with progress bars and mentor feedback
  - All weekly scores history

### Mentor + Admin (Protected - MENTOR or ADMIN role)
- /mentor - Dashboard: stats, weekly trend chart, category bar chart, top 5, needs improvement
- /mentor/evaluate - Evaluation form:
  - Searchable combobox (type to filter or create new student inline)
  - Week selector (1-16)
  - 7 category inputs with progress bars and live total
  - Duplicate week prevention
  - Notes/feedback textarea
  - Saves to API on submit
- /mentor/students - Student list with search, Add Student button, links to profiles
- /mentor/students/:id - Full profile: stats, charts, evaluation history, Student View button
- /mentor/mentors - Mentor list. Admin: add, reset password, delete. Mentor: view only
- /mentor/leaderboard - 4 tabs: Current Week, Average, Highest, Lowest

### Admin Only (Protected - ADMIN role)
- /admin - Same dashboard design as /mentor, data from API
- /admin/manage - User Management:
  - Mentor count, student count, registered accounts, restricted count
  - Mentors tab: list, add mentor (sends email), reset password, restrict/unrestrict, delete
  - Students tab: list with eval count, add student (sends email), reset password, restrict/unrestrict, delete

---

## 5. Shared Components

- AppShell: sidebar with Code Campus logo, dynamic nav (admin sees User Management extra), user name/role, logout button, mobile hamburger drawer
- PageHeader: title, subtitle, optional action buttons
- PerfBadge: Excellent / Good / Needs Improvement / Poor
- Avatar: initials-based coloured circle

---

## 6. Sidebar Navigation

For Mentor:
- Dashboard, New Evaluation, Students, Mentors, Leaderboard

For Admin (same + extra):
- Dashboard, New Evaluation, Students, Mentors, Leaderboard, User Management

---

## 7. Validation

All form fields validated client-side before API call:
- Required field checks with specific toast error messages
- Email format validation
- Password: min 8 chars + uppercase + lowercase + number + symbol
- Track selection required on register
- Duplicate evaluation prevention (same student + week)

---

## 8. Environment Variables

```
VITE_API_URL=http://localhost:4000
```
