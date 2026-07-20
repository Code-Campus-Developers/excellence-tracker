# Product Requirements Document

## Code Campus Excellence Tracker

**Date:** July 2026
**Organisation:** Code Campus International
**Status:** In Development

---

## 1. Overview

The **Code Campus Excellence Tracker** is an internal web application for the Code Campus International Software Engineering Bootcamp. It enables mentors to evaluate students weekly across defined performance categories, track progress over time, and share individual score dashboards with each student.

---

## 2. Problem Statement

The bootcamp currently has no structured way to:

- Record and track weekly student performance consistently
- Give students visibility into their own scores and progress
- Identify students who are excelling or falling behind at a glance
- Maintain a historical record of evaluations across the 16-week programme

---

## 3. Goals

1. Give mentors a fast, structured way to submit weekly evaluations
2. Provide students with a personal, read-only view of their performance
3. Surface trends and rankings to motivate healthy competition
4. Lay the foundation for a data-driven backend system

---

## 4. User Personas

### Mentor / Admin (Sarah)

- Runs the bootcamp week-to-week
- Evaluates 8–20 students every week
- Needs a dashboard to spot struggling students quickly
- Wants to add new students easily as cohort grows

### Student

- Wants to know their score and how they compare to peers
- Should NOT see other students' individual scores (future)
- Accesses their dashboard via a link shared by the mentor

---

## 5. Features & Requirements

### 5.1 Mentor Dashboard

- **F01** — Show total students enrolled
- **F02** — Show how many students have been evaluated in the current week
- **F03** — Show average score for the current week
- **F04** — Show total evaluations all-time
- **F05** — Weekly score trend chart (line chart, all weeks)
- **F06** — Category performance breakdown (bar chart)
- **F07** — Top 5 performers list (clickable → student profile)
- **F08** — Needs Improvement list (avg < 65, with progress bars)

### 5.2 New Evaluation Form

- **F09** — Searchable student selector (type to filter)
- **F10** — Ability to create a new student inline (name, email, track)
- **F11** — Week selector (Week 1–16, current week pre-selected)
- **F12** — Score input for each of 7 categories with max enforcement
- **F13** — Live score total updates as inputs change
- **F14** — Live summary panel (student info, score, performance badge)
- **F15** — Prevent duplicate submission for same student + week
- **F16** — Mentor notes/feedback textarea
- **F17** — On save: navigate to student profile with confirmation toast

### 5.3 Students List

- **F18** — List all enrolled students with avatar, track, eval count, average
- **F19** — Search/filter by name or track
- **F20** — Each row links to student's full profile

### 5.4 Student Profile (Mentor View)

- **F21** — Student header with avatar, name, email, track
- **F22** — Summary stats: latest, average, highest, lowest, trend
- **F23** — Score history line chart
- **F24** — Latest category mix radar chart
- **F25** — Full evaluation history with category breakdown and mentor notes
- **F26** — "Student View" button — opens `/student/$id` in new tab for sharing

### 5.5 Leaderboard

- **F27** — Ranked table with 4 tabs: Current Week / Overall Average / Highest Score / Lowest Score
- **F28** — Top 3 highlighted with Trophy / Medal / Award icons
- **F29** — Each row links to student profile

### 5.6 Student Portal (Student-Facing)

- **F30** — Accessible at `/student/$id` — no login required
- **F31** — Shows student's own scores only
- **F32** — Current week score with performance badge
- **F33** — Score vs class average (progress bar comparison)
- **F34** — Score history chart + radar category chart
- **F35** — Full category breakdown for latest evaluation
- **F36** — Mentor feedback/notes displayed prominently
- **F37** — All weeks score history
- **F38** — Leaderboard rank (e.g. #3 of 8)
- **F39** — No mentor navigation visible — clean student-only layout

### 5.7 Navigation

- **F40** — Sidebar navigation (desktop)
- **F41** — Hamburger drawer navigation (mobile)
- **F42** — Header search bar (press Enter → Students page)
- **F43** — Dashboard stat cards link to relevant pages

---

## 6. Evaluation Categories & Scoring

| #   | Category                   | Max     | Breakdown                                               |
| --- | -------------------------- | ------- | ------------------------------------------------------- |
| 1   | Attendance & Participation | 25      | Attend (10) + Punctual (10) + Participation (5)         |
| 2   | LinkedIn & X Visibility    | 10      | Posts ≥2×/week (5) + Engagement (5)                     |
| 3   | Project Milestone          | 20      | Weekly tasks (10) + On-time submission (5) + README (5) |
| 4   | Coding Practice            | 20      | Code ≥5 days/week (10) + ≥3 GitHub commits (10)         |
| 5   | Collaboration & Teamwork   | 10      | Monthly events (5) + Support teammates (5)              |
| 6   | Learning Logs              | 10      | Weekly reflection (10)                                  |
| 7   | Bootcamp Housekeeping      | 5       | Readings/videos (5)                                     |
|     | **Total**                  | **100** |                                                         |

**Performance Levels:**

- 🟢 Excellent: ≥ 85
- 🔵 Good: ≥ 70
- 🟡 Needs Improvement: ≥ 50
- 🔴 Poor: < 50

---

## 7. Out of Scope (v1 Prototype)

- User authentication / login system
- Data persistence (backend/database)
- Email notifications
- Student-to-student visibility controls
- Admin user management
- Mobile app

---

## 8. Future Roadmap

| Phase | Feature                                                                            |
| ----- | ---------------------------------------------------------------------------------- |
| v2    | Connect `tracking_backend` REST API — persist evaluations and students to database |
| v2    | Mentor login (JWT auth)                                                            |
| v2    | Student login with unique code or email link                                       |
| v3    | Email/WhatsApp notifications to students after evaluation                          |
| v3    | Cohort management (multiple bootcamp cohorts)                                      |
| v3    | Export evaluations to CSV/PDF                                                      |
| v4    | Mobile app for mentors                                                             |

---

## 9. Technical Notes

- **Frontend only** in current prototype — all data is in-memory React state (resets on refresh)
- **Backend folder** (`tracking_backend`) exists and is ready for API development
- Student IDs follow pattern `s1`, `s2`, etc. — will be replaced with UUIDs in production
- Bootcamp duration: **16 weeks**
