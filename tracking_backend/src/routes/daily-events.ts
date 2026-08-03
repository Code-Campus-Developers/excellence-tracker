import { Router, type Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { notifyAdmins, notifyTrackInstructor } from "./notifications";

const router = Router();

// ─── GET /api/daily-events/me  (student: own events) ─────────────────────────
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") return res.status(403).json({ error: "Students only" });
    const student = await prisma.student.findFirst({ where: { userId: req.user!.userId }, select: { id: true } });
    if (!student) return res.status(404).json({ error: "Student not found" });
    const events = await prisma.dailyEvent.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
      take: 60,
    });
    return res.json(events);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Server error" }); }
});

// ─── GET /api/daily-events/today  (student: today's record) ──────────────────
router.get("/today", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") return res.status(403).json({ error: "Students only" });
    const student = await prisma.student.findFirst({ where: { userId: req.user!.userId }, select: { id: true } });
    if (!student) return res.status(404).json({ error: "Student not found" });
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start.getTime() + 86400000);
    const event = await prisma.dailyEvent.findFirst({ where: { studentId: student.id, date: { gte: start, lt: end } } });
    return res.json(event ?? null);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Server error" }); }
});

// ─── POST /api/daily-events  (student: submit today's event) ─────────────────
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") return res.status(403).json({ error: "Students only" });
    const student = await prisma.student.findFirst({ where: { userId: req.user!.userId }, select: { id: true, name: true } });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const { description, image1, image2, date } = req.body as {
      description?: string; image1?: string | null; image2?: string | null; date?: string;
    };

    const now = date ? new Date(date) : new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    // Check if already exists for this day
    const existing = await prisma.dailyEvent.findFirst({ where: { studentId: student.id, date: { gte: startOfDay, lt: endOfDay } } });
    if (existing) {
      // Update existing record
      const updated = await prisma.dailyEvent.update({
        where: { id: existing.id },
        data: { description: description ?? null, image1: image1 ?? null, image2: image2 ?? null },
      });
      return res.json(updated);
    }

    const event = await prisma.dailyEvent.create({
      data: { studentId: student.id, date: startOfDay, description: description ?? null, image1: image1 ?? null, image2: image2 ?? null },
    });

    // Notify admin + instructor
    const msg = `${student.name} submitted a daily event.`;
    const link = `/instructor/students/${student.id}`;
    await Promise.all([notifyAdmins(msg, link), notifyTrackInstructor(student.id, msg, link)]).catch(() => {/* silent */});

    return res.status(201).json(event);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Server error" }); }
});

// ─── GET /api/daily-events/all  (instructor/admin: all students) ──────────────
router.get("/all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    let studentIds: string[] | undefined;
    if (req.user!.role === "MENTOR") {
      const instructor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { track: true } });
      if (instructor?.track) {
        const students = await prisma.student.findMany({ where: { track: instructor.track }, select: { id: true } });
        studentIds = students.map((s) => s.id);
      }
    }
    const events = await prisma.dailyEvent.findMany({
      where: studentIds ? { studentId: { in: studentIds } } : {},
      include: { student: { select: { id: true, name: true, track: true, studentCode: true } } },
      orderBy: { date: "desc" },
      take: 200,
    });
    return res.json(events);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Server error" }); }
});

// ─── GET /api/daily-events/student/:studentId  (instructor/admin) ────────────
router.get("/student/:studentId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const events = await prisma.dailyEvent.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { date: "desc" },
      take: 60,
    });
    return res.json(events);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Server error" }); }
});

export default router;
