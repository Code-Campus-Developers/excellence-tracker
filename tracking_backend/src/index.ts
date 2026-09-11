import express, { Request, Response, NextFunction } from "express";
import http from "http";
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
import bulkImportRouter from "./routes/bulk-import";
import parentsRouter from "./routes/parents";
import googleAuthRouter from "./routes/google-auth";
import { startMissedAttendanceCron } from "./lib/attendance-cron";
import prisma from "./lib/prisma";
import { authenticate, authorize } from "./middleware/authenticate";
import { initializeMessagingSocket } from "./lib/messaging-socket";

const app = express();
const PORT = process.env.PORT ?? 4000;

// Security headers
app.use(helmet());

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:8080" }));

// Body parser
app.use(express.json());

// Rate limiting removed for now — re-enable before production deployment

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/auth", authRouter);
app.use("/auth/google", googleAuthRouter);
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
app.use("/admin/bulk-import", bulkImportRouter);
app.use("/admin/parents", parentsRouter);
app.use("/api/parent", parentsRouter);

// GET /api/instructors — list instructors, accessible to any authenticated user
app.get("/api/instructors", authenticate, async (_req, res) => {
  const instructors = await prisma.user.findMany({
    where: { role: "MENTOR", isActive: true },
    select: { id: true, name: true, email: true, track: true, profilePicture: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  res.json(instructors);
});

// GET /api/instructors/:id — staff directory profile and teaching activity
app.get("/api/instructors/:id", authenticate, authorize("MENTOR", "ADMIN"), async (req, res) => {
  const instructor = await prisma.user.findFirst({
    where: { id: req.params.id, role: "MENTOR" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      track: true,
      profilePicture: true,
      isActive: true,
      createdAt: true,
      trackAssignments: { orderBy: { startDate: "desc" } },
      _count: { select: { sentMessages: true, receivedMessages: true, broadcasts: true } },
    },
  });

  if (!instructor) {
    res.status(404).json({ error: "Instructor not found" });
    return;
  }

  const now = new Date();
  const currentAssignmentCourses = instructor.trackAssignments
    .filter((assignment) => assignment.startDate <= now && (!assignment.endDate || assignment.endDate >= now))
    .map((assignment) => assignment.track);
  const assignedCourses = Array.from(new Set([
    ...(instructor.track ? [instructor.track] : []),
    ...currentAssignmentCourses,
  ]));

  const [students, evaluationsCompleted] = await Promise.all([
    assignedCourses.length > 0
      ? prisma.student.findMany({
          where: { track: { in: assignedCourses }, isArchived: false },
          select: {
            id: true,
            studentCode: true,
            name: true,
            email: true,
            track: true,
            avatarColor: true,
            user: { select: { profilePicture: true, isActive: true } },
            _count: { select: { evaluations: true, attendance: true, selfReports: true } },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.evaluation.count({ where: { evaluator: instructor.name } }),
  ]);

  res.json({ ...instructor, assignedCourses, students, evaluationsCompleted });
});

// 404
app.use((_req, res) => { res.status(404).json({ error: "Route not found" }); });

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
initializeMessagingSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  startMissedAttendanceCron();
});

export default app;
