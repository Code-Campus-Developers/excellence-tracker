import { Router, type Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, authorize, type AuthRequest } from "../middleware/authenticate";
import { sendTrackInstructorAssignedEmail } from "../lib/email";

const router = Router();

const COURSE_TRACKS = [
  "HTML/CSS",
  "JavaScript",
  "Python",
  "React.Js/Next.Js",
  "Node.Js",
  "Agentic Software Engineering",
] as const;

// ─── Helper: find currently active instructor for a track ────────────────────
export async function getCurrentInstructorForTrack(track: string, studentId?: string) {
  const now = new Date();

  // Student-specific assignments take priority; targeted assignments never
  // become the course-wide default for students who were not selected.
  const query = {
    where: {
      track,
      instructor: { isActive: true, role: "MENTOR" as const },
      startDate: { lte: now },
      OR: [
        { endDate: null },           // ongoing (no end date)
        { endDate: { gte: now } },   // not yet expired
      ],
    },
    orderBy: [{ startDate: "desc" as const }, { createdAt: "desc" as const }, { id: "desc" as const }],
    include: {
      instructor: {
        select: { id: true, name: true, email: true, track: true, profilePicture: true, isActive: true },
      },
    },
  };
  const targeted = studentId
    ? await prisma.trackAssignment.findFirst({
        ...query, where: { ...query.where, studentIds: { has: studentId } },
      })
    : null;
  const assignment = targeted ?? await prisma.trackAssignment.findFirst({
    ...query, where: { ...query.where, studentIds: { isEmpty: true } },
  });

  if (assignment && assignment.instructor.isActive) {
    return assignment.instructor;
  }

  // 2. Fallback: find any active MENTOR with matching track field (old behaviour)
  const fallback = await prisma.user.findFirst({
    where: { role: "MENTOR", track, isActive: true },
    select: { id: true, name: true, email: true, track: true, profilePicture: true },
  });

  return fallback ?? null;
}

async function validateStudents(studentIds: unknown, track: string): Promise<string | null> {
  if (!Array.isArray(studentIds) || studentIds.some((id) => typeof id !== "string" || !id.trim())) {
    return "Students must be a list of student IDs";
  }
  if (studentIds.length === 0) return null;
  const count = await prisma.student.count({
    where: { id: { in: studentIds }, track, isArchived: false },
  });
  return count === new Set(studentIds).size ? null : "Select students who belong to the selected course and are not archived";
}

// ─── GET /admin/track-assignments  ──────────────────────────────────────────
router.get("/", authenticate, authorize("ADMIN", "MENTOR"), async (_req: AuthRequest, res: Response) => {
  try {
    const assignments = await prisma.trackAssignment.findMany({
      include: {
        instructor: { select: { id: true, name: true, email: true, track: true, profilePicture: true } },
      },
      orderBy: [{ track: "asc" }, { startDate: "desc" }],
    });
    return res.json(assignments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /admin/track-assignments/current  — one per track, active today ────
router.get("/current", authenticate, authorize("ADMIN", "MENTOR"), async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const all = await prisma.trackAssignment.findMany({
      where: {
        studentIds: { isEmpty: true },
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: {
        instructor: { select: { id: true, name: true, email: true, track: true, profilePicture: true } },
      },
      orderBy: { startDate: "desc" },
    });
    // Deduplicate: keep only most recent per track
    const seen = new Set<string>();
    const current = all.filter((a) => {
      if (seen.has(a.track)) return false;
      seen.add(a.track);
      return true;
    });
    return res.json(current);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /admin/track-assignments  — create ────────────────────────────────
router.post("/", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { instructorId, track, courseTrack, startDate, endDate, notes, studentIds = [] } = req.body as {
      instructorId: string; track: string; startDate: string;
      courseTrack: string; endDate?: string | null; notes?: string | null;
      studentIds?: string[];
    };
    if (!instructorId || !track || !courseTrack || !startDate) {
      return res.status(400).json({ error: "Instructor, course, track, and start date are required" });
    }
    if (!(COURSE_TRACKS as readonly string[]).includes(courseTrack)) {
      return res.status(400).json({ error: "Invalid track" });
    }
    const studentError = await validateStudents(studentIds, track);
    if (studentError) return res.status(400).json({ error: studentError });
    const instructor = await prisma.user.findFirst({ where: { id: instructorId, role: "MENTOR", isActive: true } });
    if (!instructor) return res.status(400).json({ error: "Select an active instructor" });
    const assignment = await prisma.trackAssignment.create({
      data: {
        instructorId,
        track,
        courseTrack,
        studentIds: [...new Set(studentIds)],
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes ?? null,
      },
      include: {
        instructor: { select: { id: true, name: true, email: true, track: true } },
      },
    });

    // Limit assignment emails to the selected students when provided.
    const students = await prisma.student.findMany({
      where: { track, isArchived: false, ...(studentIds.length > 0 && { id: { in: studentIds } }) },
      include: { user: { select: { email: true } } },
    });
    const startDateStr = new Date(startDate).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
    for (const student of students) {
      if (student.user?.email) {
        try {
          await sendTrackInstructorAssignedEmail({
            to: student.user.email,
            studentName: student.name,
            instructorName: assignment.instructor.name,
            track,
            startDate: startDateStr,
          });
        } catch { /* email failure should not break the response */ }
      }
    }

    return res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── PUT /admin/track-assignments/:id  — update (extend, change end date) ───
router.put("/:id", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { instructorId, track, courseTrack, startDate, endDate, notes, studentIds } = req.body as {
      courseTrack?: string; startDate?: string; endDate?: string | null; notes?: string | null;
      instructorId?: string; track?: string; studentIds?: string[];
    };
    const existing = await prisma.trackAssignment.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Assignment not found" });
    if (courseTrack !== undefined && !(COURSE_TRACKS as readonly string[]).includes(courseTrack)) {
      return res.status(400).json({ error: "Invalid track" });
    }
    if (track !== undefined && (typeof track !== "string" || !track.trim())) {
      return res.status(400).json({ error: "Course is required" });
    }
    if (studentIds !== undefined || track !== undefined && track !== existing.track) {
      const studentError = await validateStudents(studentIds === undefined ? existing.studentIds : studentIds, track ?? existing.track);
      if (studentError) return res.status(400).json({ error: studentError });
    }
    if (instructorId !== undefined) {
      const instructor = await prisma.user.findFirst({ where: { id: instructorId, role: "MENTOR", isActive: true } });
      if (!instructor) return res.status(400).json({ error: "Select an active instructor" });
    }
    const assignment = await prisma.trackAssignment.update({
      where: { id: req.params.id },
      data: {
        ...(instructorId !== undefined && { instructorId }),
        ...(track !== undefined && { track }),
        ...(studentIds !== undefined && { studentIds: [...new Set(studentIds)] }),
        ...(courseTrack !== undefined && { courseTrack }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        instructor: { select: { id: true, name: true, email: true, track: true } },
      },
    });
    return res.json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /admin/track-assignments/:id ────────────────────────────────────
router.delete("/:id", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.trackAssignment.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
