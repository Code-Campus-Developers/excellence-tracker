import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

import studentsRouter from "./routes/students";
import evaluationsRouter from "./routes/evaluations";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import settingsRouter, { adminSettingsRouter } from "./routes/settings";
import notificationsRouter from "./routes/notifications";
import selfReportsRouter from "./routes/self-reports";
import dailyEventsRouter from "./routes/daily-events";
import messagesRouter from "./routes/messages";
import attendanceRouter from "./routes/attendance";
import uploadRouter from "./routes/upload";
import trackAssignmentsRouter from "./routes/track-assignments";
import prisma from "./lib/prisma";
import { authenticate } from "./middleware/authenticate";

const app = express();
const PORT = process.env.PORT ?? 4000;

// Security headers
app.use(helmet());

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:8080" }));

// Body parser
app.use(express.json());

// Rate limit only sensitive auth endpoints (login, register, forgot/reset password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please try again later." },
});
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);
app.use("/auth/forgot-password", authLimiter);
app.use("/auth/reset-password", authLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/admin/settings", adminSettingsRouter);
app.use("/api/students", studentsRouter);
app.use("/api/evaluations", evaluationsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/self-reports", selfReportsRouter);
app.use("/api/daily-events", dailyEventsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/upload", uploadRouter);
app.use("/admin/track-assignments", trackAssignmentsRouter);

// GET /api/instructors — list instructors, accessible to any authenticated user
app.get("/api/instructors", authenticate, async (_req, res) => {
  const instructors = await prisma.user.findMany({
    where: { role: "MENTOR", isActive: true },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  res.json(instructors);
});

// 404
app.use((_req, res) => { res.status(404).json({ error: "Route not found" }); });

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});

export default app;
