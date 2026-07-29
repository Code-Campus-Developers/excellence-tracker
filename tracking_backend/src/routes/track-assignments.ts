import { Router, type Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, authorize, type AuthRequest } from "../middleware/authenticate";

const router = Router();

// ─── Helper: find currently active instructor for a track ────────────────────
export async function getCurrentInstructorForTrack(track: string) {
  const now = new Date();

  // 1. Check TrackAssignment table (date-based)
  const assignment = await prisma.trackAssignment.findFirst({
    where: {
      track,
      startDate: { lte: now },
      OR: [
        { endDate: null },           // ongoing (no end date)
        { endDate: { gte: now } },   // not yet expired
      ],
    },
    orderBy: { startDate: "desc" }, // most recent assignment wins
    include: {
      instructor: {
        select: { id: true, name: true, email: true, track: true, profilePicture: true, isActive: true },
      },
    },
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
    const { instructorId, track, startDate, endDate, notes } = req.body as {
      instructorId: string; track: string; startDate: string;
      endDate?: string | null; notes?: string | null;
    };
    if (!instructorId || !track || !startDate) {
      return res.status(400).json({ error: "instructorId, track, and startDate are required" });
    }
    const assignment = await prisma.trackAssignment.create({
      data: {
        instructorId,
        track,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes ?? null,
      },
      include: {
        instructor: { select: { id: true, name: true, email: true, track: true } },
      },
    });
    return res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── PUT /admin/track-assignments/:id  — update (extend, change end date) ───
router.put("/:id", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, notes } = req.body as {
      startDate?: string; endDate?: string | null; notes?: string | null;
    };
    const assignment = await prisma.trackAssignment.update({
      where: { id: req.params.id },
      data: {
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
