# tracking_frontend

React + TypeScript frontend for the **Code Campus Excellence Tracker**. Built with TanStack Start (SSR), TanStack Router, Tailwind CSS v4, and shadcn/ui.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Routing/SSR | TanStack Start + TanStack Router v1 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| State | React Context (auth + data store) |
| Notifications | Sonner |

---

## Getting Started

```bash
cd tracking_frontend
npm install
cp .env.example .env
npm run dev   # http://localhost:8080
```

### Environment Variables
```env
VITE_API_URL=http://localhost:4000
```

---

## Pages and Routes

### Public
- / — Landing page
- /login — Login
- /register — Student self-registration
- /forgot-password — Request reset link
- /reset-password — Set new password

### Student (auth required)
- /dashboard — Personal score dashboard

### Mentor (auth required)
- /mentor — Stats dashboard
- /mentor/evaluate — Create weekly evaluation
- /mentor/students — Browse students
- /mentor/students/id — Student profile
- /mentor/leaderboard — Rankings

### Admin (auth required)
- /admin — Manage mentors and students

---

## Available Tracks
Software Engineering, Data Analytics, Cloud Engineering, Digital Marketing, Cybersecurity Engineering, Artificial Intelligence (AI), Blockchain Engineering, Project Management, Product Design, Product Management

---

## Evaluation Categories (100 pts total)

| Category | Max |
|---|---|
| Attendance and Participation | 25 |
| Project Milestone | 20 |
| Coding Practice | 20 |
| LinkedIn and X Visibility | 10 |
| Collaboration and Teamwork | 10 |
| Learning Logs | 10 |
| Bootcamp Housekeeping | 5 |

Performance Levels: Excellent (>=85) | Good (>=70) | Needs Improvement (>=50) | Poor (<50)

---

## Build for Production
```bash
npm run build
```
