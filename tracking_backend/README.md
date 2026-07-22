# tracking_backend

Express + Prisma + PostgreSQL REST API for the **Code Campus Excellence Tracker**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Language | TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 17 (local) → Supabase (production) |
| Email | Resend |
| Security | helmet + express-rate-limit + bcrypt |

---

## Getting Started

```bash
npm install
cp .env.example .env
# Fill in all values
psql -U postgres -c "CREATE DATABASE excellence_tracker;"
npx prisma migrate deploy
npm run dev
```

API runs at **http://localhost:4000**

---

## Environment Variables

```
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/excellence_tracker
FRONTEND_URL=http://localhost:8080
APP_URL=http://localhost:8080
JWT_SECRET=your-secret
RESEND_API_KEY=re_xxx
FROM_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=admin@codecampus.ng
ADMIN_PASSWORD=YourStrongPassword
```

---

## Seeding

| Script | Purpose | Safe in production? |
|---|---|---|
| `npm run db:seed` | Full reset with demo data | Never in production |
| `npm run db:seed:prod` | Creates admin + settings only if absent | Always safe |

**Production first launch:**
```bash
npm run db:seed:prod
```
Run this once from the Render/Railway shell after first deployment.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Full dev seed |
| `npm run db:seed:prod` | Safe production seed |

---

## Production Deployment (Render)

**Build Command:**
```
npm install && npm run build && npx prisma generate
```

**Start Command:**
```
npx prisma migrate deploy && npm run start
```

**First launch (run once in Render shell):**
```
npm run db:seed:prod
```

---

## Switching to Supabase

Change only `DATABASE_URL` in `.env`. No code changes needed.

Express + Prisma + PostgreSQL REST API for the **Code Campus Excellence Tracker**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Language | TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 17 (local) → Supabase (production) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL installed and running

### Installation

```bash
cd tracking_backend
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=4000
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/excellence_tracker"
FRONTEND_URL=http://localhost:8080
```

### Create the Database

```bash
psql -U postgres -c "CREATE DATABASE excellence_tracker;"
```

### Run Migrations

```bash
npm run db:migrate
```

### Seed with Sample Data

```bash
npm run db:seed
```

### Start Dev Server

```bash
npm run dev
```

API runs at **http://localhost:4000**

---

## API Endpoints

### Health
| Method | Route | Description |
|---|---|---|
| GET | `/health` | Server health check |

### Students
| Method | Route | Description |
|---|---|---|
| GET | `/api/students` | List all students |
| GET | `/api/students/:id` | Get one student |
| POST | `/api/students` | Create new student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |

### Evaluations
| Method | Route | Description |
|---|---|---|
| GET | `/api/evaluations` | List all evaluations |
| GET | `/api/evaluations/student/:studentId` | Evaluations for a student |
| GET | `/api/evaluations/week/:week` | Evaluations for a week |
| POST | `/api/evaluations` | Create new evaluation |
| DELETE | `/api/evaluations/:id` | Delete evaluation |

---

## Switching to Supabase

Change only one line in `.env`:

```env
DATABASE_URL="postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres"
```

Then run:
```bash
npm run db:migrate
npm run db:seed
```

No code changes needed.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:seed` | Seed database with sample data |
