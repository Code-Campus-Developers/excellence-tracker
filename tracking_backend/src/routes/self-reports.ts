import { Router, type Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { notifyAdmins, notifyTrackInstructor } from "./notifications";

const router = Router();

// GET /api/self-reports/all  (instructor/admin: all reports with student info)
router.get("/all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    let where = {};
    if (req.user!.role === "MENTOR") {
      const instructor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { track: true } });
      if (instructor?.track) {
        where = { student: { track: instructor.track } };
      }
    }
    const reports = await prisma.selfReport.findMany({
      where,
      include: { student: { select: { id: true, name: true, track: true, studentCode: true } } },
      orderBy: [{ cohortYear: "desc" }, { weekNumber: "desc" }, { submittedAt: "desc" }],
    });
    return res.json(reports);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/self-reports/me  (student: own reports)
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") {
      return res.status(403).json({ error: "Students only" });
    }
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ error: "Student record not found" });
    const reports = await prisma.selfReport.findMany({
      where: { studentId: student.id },
      orderBy: [{ cohortYear: "desc" }, { weekNumber: "desc" }],
    });
    return res.json(reports);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/self-reports/student/:studentId  (instructor/admin)
router.get("/student/:studentId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const reports = await prisma.selfReport.findMany({
      where: { studentId: req.params.studentId },
      orderBy: [{ cohortYear: "desc" }, { weekNumber: "desc" }],
    });
    return res.json(reports);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/self-reports  (student submit/update)
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") {
      return res.status(403).json({ error: "Students only" });
    }
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ error: "Student record not found" });

    const {
      weekNumber, cohortYear,
      linkedinDone, linkedinUrl,
      learningLogDone, learningLogUrl,
      codingDone, codingUrl,
      eventDone, eventUrl, eventImage1, eventImage2,
      notes,
    } = req.body as {
      weekNumber: number; cohortYear?: number;
      linkedinDone?: boolean; linkedinUrl?: string | null;
      learningLogDone?: boolean; learningLogUrl?: string | null;
      codingDone?: boolean; codingUrl?: string | null;
      eventDone?: boolean; eventUrl?: string | null;
      eventImage1?: string | null; eventImage2?: string | null;
      notes?: string | null;
    };

    if (!weekNumber || weekNumber < 1) {
      return res.status(400).json({ error: "weekNumber is required" });
    }
    const year = cohortYear ?? new Date().getFullYear();

    const report = await prisma.selfReport.upsert({
      where: { studentId_weekNumber_cohortYear: { studentId: student.id, weekNumber, cohortYear: year } },
      update: {
        linkedinDone: linkedinDone ?? false, linkedinUrl: linkedinUrl ?? null,
        learningLogDone: learningLogDone ?? false, learningLogUrl: learningLogUrl ?? null,
        codingDone: codingDone ?? false, codingUrl: codingUrl ?? null,
        eventDone: eventDone ?? false, eventUrl: eventUrl ?? null,
        eventImage1: eventImage1 ?? null, eventImage2: eventImage2 ?? null,
        notes: notes ?? null,
        status: "PENDING", verifiedById: null, verifiedAt: null,
      },
      create: {
        studentId: student.id, weekNumber, cohortYear: year,
        linkedinDone: linkedinDone ?? false, linkedinUrl: linkedinUrl ?? null,
        learningLogDone: learningLogDone ?? false, learningLogUrl: learningLogUrl ?? null,
        codingDone: codingDone ?? false, codingUrl: codingUrl ?? null,
        eventDone: eventDone ?? false, eventUrl: eventUrl ?? null,
        eventImage1: eventImage1 ?? null, eventImage2: eventImage2 ?? null,
        notes: notes ?? null,
      },
    });

    // Notify admin + track instructor
    const studentInfo = await prisma.student.findUnique({ where: { id: student.id }, select: { name: true } });
    const msg = `${studentInfo?.name ?? "A student"} submitted their Week ${weekNumber} self-report.`;
    const link = `/instructor/students/${student.id}`;
    await Promise.all([
      notifyAdmins(msg, link),
      notifyTrackInstructor(student.id, msg, link),
    ]);

    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/self-reports/:id/verify  (instructor/admin)
router.patch("/:id/verify", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const { status } = req.body as { status: "VERIFIED" | "REJECTED" };
    if (status !== "VERIFIED" && status !== "REJECTED") {
      return res.status(400).json({ error: "status must be VERIFIED or REJECTED" });
    }
    const report = await prisma.selfReport.update({
      where: { id: req.params.id },
      data: { status, verifiedById: req.user!.userId, verifiedAt: new Date() },
    });
    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
