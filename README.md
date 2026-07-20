# Code Campus Excellence Tracker

A weekly performance tracking system for the **Code Campus International** Software Engineering Bootcamp. Mentors evaluate students across 7 categories each week, and students can view their own scores via a personal dashboard.

---

## Project Structure

```
Code-Campus-Excellence-Tracker/
├── tracking_frontend/     # React frontend app
└── tracking_backend/      # Backend API (in development)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Routing | TanStack Router v1 |
| Server | TanStack Start (SSR) |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| State | React Context (in-memory frontend) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
cd tracking_frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

App runs at **http://localhost:8080** (or next available port).

### Build for Production

```bash
npm run build
```

---

## Pages & Routes

| Route | Who | Description |
|---|---|---|
| `/` | Mentor | Dashboard — weekly stats, charts, top performers |
| `/evaluate` | Mentor | Create a new weekly evaluation for a student |
| `/students` | Mentor | Browse and search all students |
| `/students/$id` | Mentor | Full student profile with score history |
| `/leaderboard` | Mentor | Ranked student performance (4 views) |
| `/student/$id` | Student | Personal score dashboard (shareable link) |

---

## Evaluation Categories

Students are scored weekly across 7 categories (total: 100 pts):

| Category | Max Points |
|---|---|
| Attendance & Participation | 25 |
| LinkedIn & X Visibility | 10 |
| Project Milestone | 20 |
| Coding Practice | 20 |
| Collaboration & Teamwork | 10 |
| Learning Logs | 10 |
| Bootcamp Housekeeping | 5 |

---

## Student Portal

Each student has a personal dashboard at `/student/{id}` showing:
- Current week score and performance level
- Score vs class average
- Score history chart
- Category breakdown
- Mentor feedback/notes
- Leaderboard rank

Mentors can share this link directly with each student from their profile page (click **Student View**).

---

## Current Limitations (frontend)

- Data is in-memory only — resets on page refresh
- No authentication — mentor and student views are URL-based
- Backend (`tracking_backend`) not yet connected

---

## Bootcamp Info

- **Duration:** 16 weeks
- **Current Week:** 4
- **Performance Levels:** Excellent (≥85) · Good (≥70) · Needs Improvement (≥50) · Poor (<50)
