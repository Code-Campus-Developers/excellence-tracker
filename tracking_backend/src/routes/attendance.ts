import { Router, type Response, type Request } from "express";
import prisma from "../lib/prisma";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { notifyAdmins, notifyTrackInstructor, notifyParentsAttendance, notifyParentsInApp } from "./notifications";

const router = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Return start and end of today in UTC (midnight-to-midnight) */
function todayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Minutes between two dates, rounded */
function minutesDiff(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

// ─── GET /api/attendance/today  — student checks today's record ───────────────
router.get("/today", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") {
      return res.status(403).json({ error: "Students only" });
    }
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ error: "Student record not found" });

    const { start, end } = todayRange();
    const record = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: { gte: start, lt: end } },
    });
    return res.json(record ?? null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/attendance/clock-in ───────────────────────────────────────────
router.post("/clock-in", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") {
      return res.status(403).json({ error: "Students only" });
    }
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ error: "Student record not found" });

    const { start, end } = todayRange();
    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: { gte: start, lt: end } },
    });

    if (existing) {
      if (!existing.clockOutAt) {
        return res.status(409).json({ error: "Already clocked in today" });
      }
      return res.status(409).json({ error: "Already completed attendance for today" });
    }

    const now = new Date();
    const record = await prisma.attendance.create({
      data: {
        studentId: student.id,
        date: start,
        clockInAt: now,
      },
    });

    // Notify admin + track instructor
    const sInfo = await prisma.student.findUnique({ where: { id: student.id }, select: { name: true } });
    const msg = `${sInfo?.name ?? "A student"} clocked in at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
    const link = `/instructor/students/${student.id}`;
    await Promise.all([
      notifyAdmins(msg, link),
      notifyTrackInstructor(student.id, msg, link),
    ]);

    // Notify parents (email + in-app)
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    notifyParentsAttendance({
      studentId: student.id,
      studentName: sInfo?.name ?? "Student",
      action: "clock_in",
      time: timeStr,
    }).catch(() => {/* silent */});
    notifyParentsInApp(student.id, `${sInfo?.name ?? "Your child"} clocked in at ${timeStr}.`).catch(() => {});

    return res.status(201).json(record);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/attendance/clock-out ──────────────────────────────────────────
router.post("/clock-out", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") {
      return res.status(403).json({ error: "Students only" });
    }
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ error: "Student record not found" });

    const { start, end } = todayRange();
    const record = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: { gte: start, lt: end } },
    });

    if (!record) {
      return res.status(404).json({ error: "No clock-in found for today" });
    }
    if (record.clockOutAt) {
      return res.status(409).json({ error: "Already clocked out today" });
    }

    const now = new Date();
    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: {
        clockOutAt: now,
        durationMin: minutesDiff(record.clockInAt, now),
        notes: (req.body as { notes?: string }).notes ?? null,
      },
    });

    // Notify admin + track instructor
    const sInfo = await prisma.student.findUnique({ where: { id: student.id }, select: { name: true } });
    const dur = minutesDiff(record.clockInAt, now);
    const durStr = dur < 60 ? `${dur}m` : `${Math.floor(dur/60)}h ${dur%60}m`;
    const msg = `${sInfo?.name ?? "A student"} clocked out. Session: ${durStr}.`;
    const link = `/instructor/students/${student.id}`;
    await Promise.all([
      notifyAdmins(msg, link),
      notifyTrackInstructor(student.id, msg, link),
    ]);

    // Notify parents (email + in-app)
    const clockOutTimeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    notifyParentsAttendance({
      studentId: student.id,
      studentName: sInfo?.name ?? "Student",
      action: "clock_out",
      time: clockOutTimeStr,
      durationMin: dur,
    }).catch(() => {/* silent */});
    notifyParentsInApp(student.id, `${sInfo?.name ?? "Your child"} clocked out. Session: ${durStr}.`).catch(() => {});

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/attendance/me  — student's own history ─────────────────────────
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

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
      take: 60,
    });
    return res.json(records);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/attendance/all  (instructor/admin: all with student info) ──────
router.get("/all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    // For MENTOR, filter to their track's students
    let studentIds: string[] | undefined;
    if (req.user!.role === "MENTOR") {
      const instructor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { track: true } });
      if (instructor?.track) {
        const students = await prisma.student.findMany({ where: { track: instructor.track }, select: { id: true } });
        studentIds = students.map((s) => s.id);
      }
    }
    const records = await prisma.attendance.findMany({
      where: studentIds ? { studentId: { in: studentIds } } : {},
      include: { student: { select: { id: true, name: true, track: true, studentCode: true } } },
      orderBy: { date: "desc" },
      take: 200,
    });
    return res.json(records);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/attendance/student/:studentId  (instructor/admin) ───────────────
router.get("/student/:studentId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const records = await prisma.attendance.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { date: "desc" },
      take: 60,
    });
    return res.json(records);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/attendance/manual  (instructor/admin: add for any student/date) ─
router.post("/manual", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const { studentId, date, clockInAt, clockOutAt } = req.body as {
      studentId: string; date: string; clockInAt: string; clockOutAt?: string;
    };
    if (!studentId || !date || !clockInAt) {
      return res.status(400).json({ error: "studentId, date, and clockInAt are required" });
    }
    const dateObj = new Date(date);
    const clockIn = new Date(clockInAt);
    const clockOut = clockOutAt ? new Date(clockOutAt) : null;
    const duration = clockOut ? minutesDiff(clockIn, clockOut) : null;

    // Check if record already exists for this student on this date
    const startOfDay = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
    const existing = await prisma.attendance.findFirst({
      where: { studentId, date: { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86400000) } },
    });
    if (existing) {
      return res.status(409).json({ error: "Attendance record already exists for this student on this date. Use edit instead." });
    }

    const record = await prisma.attendance.create({
      data: { studentId, date: startOfDay, clockInAt: clockIn, clockOutAt: clockOut, durationMin: duration },
      include: { student: { select: { id: true, name: true, track: true, studentCode: true } } },
    });
    return res.status(201).json(record);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── PUT /api/attendance/:id  (instructor/admin: edit record) ─────────────────
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const { clockInAt, clockOutAt } = req.body as { clockInAt: string; clockOutAt?: string | null };
    const clockIn = new Date(clockInAt);
    const clockOut = clockOutAt ? new Date(clockOutAt) : null;
    const duration = clockOut ? minutesDiff(clockIn, clockOut) : null;

    const updated = await prisma.attendance.update({
      where: { id: req.params.id },
      data: { clockInAt: clockIn, clockOutAt: clockOut, durationMin: duration },
      include: { student: { select: { id: true, name: true, track: true, studentCode: true } } },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /api/attendance/:id  (instructor/admin: remove incorrect record) ──
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    await prisma.attendance.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/attendance/scan  (QR scanner app — API key auth) ──────────────
// No JWT required. Scanner app sends SCANNER_API_KEY in Authorization header.
router.post("/scan", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedKey = process.env.SCANNER_API_KEY;
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return res.status(401).json({ success: false, error: "Invalid scanner API key" });
    }

    const { studentCode } = req.body as { studentCode?: string };
    if (!studentCode) {
      return res.status(400).json({ success: false, error: "studentCode is required" });
    }

    // Find student by studentCode
    const student = await prisma.student.findFirst({
      where: { studentCode: studentCode.trim() },
      select: { id: true, name: true, track: true, studentCode: true },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: `Student not found: ${studentCode}` });
    }

    const { start, end } = todayRange();
    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: { gte: start, lt: end } },
    });
    const now = new Date();

    // Already clocked out → done for today
    if (existing?.clockOutAt) {
      return res.json({
        success: true,
        action: "already_complete",
        student: { name: student.name, code: student.studentCode, track: student.track },
        message: `${student.name} has already completed attendance for today.`,
        clockIn: existing.clockInAt,
        clockOut: existing.clockOutAt,
        durationMin: existing.durationMin,
      });
    }

    // Currently clocked in → clock out
    if (existing && !existing.clockOutAt) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { clockOutAt: now, durationMin: minutesDiff(existing.clockInAt, now) },
      });
      const dur = minutesDiff(existing.clockInAt, now);
      const durStr = dur < 60 ? `${dur}m` : `${Math.floor(dur/60)}h ${dur%60}m`;

      // Notify
      const msg = `${student.name} clocked out via QR. Session: ${durStr}.`;
      const link = `/instructor/students/${student.id}`;
      await Promise.all([notifyAdmins(msg, link), notifyTrackInstructor(student.id, msg, link)]).catch(() => {});

      // Notify parents
      notifyParentsAttendance({
        studentId: student.id,
        studentName: student.name,
        action: "clock_out",
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMin: minutesDiff(existing.clockInAt, now),
      }).catch(() => {/* silent */});

      return res.json({
        success: true,
        action: "clock_out",
        student: { name: student.name, code: student.studentCode, track: student.track },
        message: `${student.name} clocked OUT. Duration: ${durStr}`,
        clockIn: existing.clockInAt,
        clockOut: updated.clockOutAt,
        durationMin: updated.durationMin,
        timestamp: now,
      });
    }

    // Not clocked in yet → clock in
    const record = await prisma.attendance.create({
      data: { studentId: student.id, date: start, clockInAt: now },
    });

    // Notify
    const msg = `${student.name} clocked in via QR at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
    const link = `/instructor/students/${student.id}`;
    await Promise.all([notifyAdmins(msg, link), notifyTrackInstructor(student.id, msg, link)]).catch(() => {});

    // Notify parents
    notifyParentsAttendance({
      studentId: student.id,
      studentName: student.name,
      action: "clock_in",
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }).catch(() => {/* silent */});

    return res.status(201).json({
      success: true,
      action: "clock_in",
      student: { name: student.name, code: student.studentCode, track: student.track },
      message: `${student.name} clocked IN successfully.`,
      clockIn: record.clockInAt,
      timestamp: now,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── POST /api/attendance/scan-staff  (admin/instructor JWT auth — no API key needed) ─
router.post("/scan-staff", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    if (role !== "ADMIN" && role !== "MENTOR") {
      return res.status(403).json({ success: false, error: "Admin or instructor access only" });
    }

    const { studentCode, mode } = req.body as { studentCode?: string; mode?: "clock_in" | "clock_out" };
    if (!studentCode) {
      return res.status(400).json({ success: false, error: "studentCode is required" });
    }
    if (mode !== "clock_in" && mode !== "clock_out") {
      return res.status(400).json({ success: false, error: "mode must be 'clock_in' or 'clock_out'" });
    }

    const student = await prisma.student.findFirst({
      where: { studentCode: studentCode.trim() },
      select: { id: true, name: true, track: true, studentCode: true },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: `Student not found: ${studentCode}` });
    }

    const { start, end } = todayRange();
    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: { gte: start, lt: end } },
    });
    const now = new Date();

    // ── CLOCK IN mode ─────────────────────────────────────────────────────────
    if (mode === "clock_in") {
      if (existing) {
        return res.json({
          success: true, action: "already_complete",
          student: { name: student.name, code: student.studentCode, track: student.track },
          message: `${student.name} already clocked in today.`,
          durationMin: existing.durationMin ?? null,
        });
      }
      const record = await prisma.attendance.create({
        data: { studentId: student.id, date: start, clockInAt: now },
      });
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const link = `/instructor/students/${student.id}`;
      await Promise.all([notifyAdmins(`${student.name} clocked in at ${timeStr}.`, link), notifyTrackInstructor(student.id, `${student.name} clocked in at ${timeStr}.`, link)]).catch(() => {});
      notifyParentsAttendance({ studentId: student.id, studentName: student.name, action: "clock_in", time: timeStr }).catch(() => {});
      notifyParentsInApp(student.id, `${student.name} clocked in at ${timeStr}.`).catch(() => {});
      return res.status(201).json({
        success: true, action: "clock_in",
        student: { name: student.name, code: student.studentCode, track: student.track },
        message: `${student.name} clocked IN at ${timeStr}.`,
      });
    }

    // ── CLOCK OUT mode ────────────────────────────────────────────────────────
    if (!existing || !existing.clockInAt) {
      return res.json({
        success: false,
        student: { name: student.name, code: student.studentCode, track: student.track },
        error: `${student.name} hasn't clocked in today yet.`,
      });
    }
    if (existing.clockOutAt) {
      return res.json({
        success: true, action: "already_complete",
        student: { name: student.name, code: student.studentCode, track: student.track },
        message: `${student.name} already clocked out today.`,
        durationMin: existing.durationMin,
      });
    }
    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: { clockOutAt: now, durationMin: minutesDiff(existing.clockInAt, now) },
    });
    const dur = minutesDiff(existing.clockInAt, now);
    const durStr = dur < 60 ? `${dur}m` : `${Math.floor(dur / 60)}h ${dur % 60}m`;
    const link = `/instructor/students/${student.id}`;
    await Promise.all([notifyAdmins(`${student.name} clocked out. Session: ${durStr}.`, link), notifyTrackInstructor(student.id, `${student.name} clocked out. Session: ${durStr}.`, link)]).catch(() => {});
    notifyParentsAttendance({ studentId: student.id, studentName: student.name, action: "clock_out", time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), durationMin: dur }).catch(() => {});
    notifyParentsInApp(student.id, `${student.name} clocked out. Session: ${durStr}.`).catch(() => {});
    return res.json({
      success: true, action: "clock_out",
      student: { name: student.name, code: student.studentCode, track: student.track },
      message: `${student.name} clocked OUT. Duration: ${durStr}`,
      durationMin: updated.durationMin,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─── POST /api/attendance/scan-parent  (parent JWT auth — scan child's QR) ───
router.post("/scan-parent", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "PARENT") {
      return res.status(403).json({ success: false, error: "Parents only" });
    }

    const { studentCode } = req.body as { studentCode?: string };
    if (!studentCode) {
      return res.status(400).json({ success: false, error: "studentCode is required" });
    }

    // Find student by code
    const student = await prisma.student.findFirst({
      where: { studentCode: studentCode.trim() },
      select: { id: true, name: true, track: true, studentCode: true },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Verify this student is linked to the parent
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: req.user!.userId, studentId: student.id } },
    });
    if (!link) {
      return res.status(403).json({ success: false, error: "This student is not linked to your account" });
    }

    const { start, end } = todayRange();
    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, date: { gte: start, lt: end } },
    });
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (existing?.clockOutAt) {
      return res.json({
        success: true,
        action: "already_complete",
        student: { name: student.name, code: student.studentCode, track: student.track },
        message: `${student.name} has already completed attendance for today.`,
        clockIn: existing.clockInAt,
        clockOut: existing.clockOutAt,
        durationMin: existing.durationMin,
      });
    }

    if (existing && !existing.clockOutAt) {
      const dur = minutesDiff(existing.clockInAt, now);
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { clockOutAt: now, durationMin: dur },
      });
      const durStr = dur < 60 ? `${dur}m` : `${Math.floor(dur/60)}h ${dur%60}m`;
      const msg = `${student.name} clocked out via parent QR scan. Session: ${durStr}.`;
      await Promise.all([notifyAdmins(msg, `/instructor/students/${student.id}`), notifyTrackInstructor(student.id, msg)]).catch(() => {});
      notifyParentsAttendance({ studentId: student.id, studentName: student.name, action: "clock_out", time: timeStr, durationMin: dur }).catch(() => {});
      return res.json({
        success: true, action: "clock_out",
        student: { name: student.name, code: student.studentCode, track: student.track },
        message: `${student.name} clocked OUT. Duration: ${durStr}`,
        clockIn: existing.clockInAt, clockOut: updated.clockOutAt, durationMin: updated.durationMin, timestamp: now,
      });
    }

    const record = await prisma.attendance.create({ data: { studentId: student.id, date: start, clockInAt: now } });
    const msg = `${student.name} clocked in via parent QR scan at ${timeStr}.`;
    await Promise.all([notifyAdmins(msg, `/instructor/students/${student.id}`), notifyTrackInstructor(student.id, msg)]).catch(() => {});
    notifyParentsAttendance({ studentId: student.id, studentName: student.name, action: "clock_in", time: timeStr }).catch(() => {});
    return res.status(201).json({
      success: true, action: "clock_in",
      student: { name: student.name, code: student.studentCode, track: student.track },
      message: `${student.name} clocked IN successfully.`,
      clockIn: record.clockInAt, timestamp: now,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
