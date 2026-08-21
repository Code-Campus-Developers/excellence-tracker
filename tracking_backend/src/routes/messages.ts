import { Router, type Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { getCurrentInstructorForTrack } from "./track-assignments";
import { createNotification, notifyAdmins } from "./notifications";

const router = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

/** IDs of the two users in a thread, sorted so A-B === B-A */
function threadKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

// ─── GET /api/messages/contacts
//     Instructor → list students on their track
//     Admin → list all instructors + students
router.get("/contacts", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    let where: Record<string, unknown> = {};
    if (req.user!.role === "MENTOR") {
      const instructor = await prisma.user.findUnique({ where: { id: me }, select: { track: true } });
      if (instructor?.track) {
        // Return students on their track
        const students = await prisma.student.findMany({
          where: { track: instructor.track },
          include: { user: { select: { id: true, name: true, profilePicture: true, isActive: true } } },
        });
        const contacts = students
          .filter((s) => s.user && s.user.isActive && s.user.id !== me)
          .map((s) => ({ id: s.user!.id, name: s.name, role: "STUDENT", track: s.track, profilePicture: s.user!.profilePicture }));
        return res.json(contacts);
      }
      // fallback: admins only
      where = { role: "ADMIN", isActive: true, id: { not: me } };
    } else if (req.user!.role === "ADMIN") {
      where = { role: { in: ["MENTOR", "STUDENT"] }, isActive: true, id: { not: me } };
    } else {
      return res.status(403).json({ error: "Not allowed" });
    }
    const contacts = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, track: true, profilePicture: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return res.json(contacts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/messages/instructor
//     Student → find their assigned track instructor
router.get("/instructor", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "STUDENT") {
      return res.status(403).json({ error: "Students only" });
    }
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      select: { track: true },
    });
    if (!student) return res.status(404).json({ error: "Student record not found" });

    // Use track assignment table for the authoritative instructor
    const assignedInstructor = await getCurrentInstructorForTrack(student.track);
    if (assignedInstructor) {
      const user = await prisma.user.findUnique({
        where: { id: assignedInstructor.id },
        select: { id: true, name: true, email: true, track: true, profilePicture: true },
      });
      return res.json(user ?? null);
    }

    // Fallback: find any active instructor for this track
    const instructor = await prisma.user.findFirst({
      where: { role: "MENTOR", track: student.track, isActive: true },
      select: { id: true, name: true, email: true, track: true, profilePicture: true },
    });
    return res.json(instructor ?? null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/messages/thread/:userId
//     Get the full message thread between current user and another user
router.get("/thread/:userId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    const other = req.params.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: me, receiverId: other },
          { senderId: other, receiverId: me },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, content: true, isRead: true, createdAt: true,
        senderId: true, receiverId: true,
        sender: { select: { name: true, profilePicture: true } },
      },
    });

    // mark incoming messages as read
    await prisma.message.updateMany({
      where: { senderId: other, receiverId: me, isRead: false },
      data: { isRead: true },
    });

    return res.json(messages);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/messages/inbox
//     Instructor/Admin: list all conversations (one per contact, latest msg)
router.get("/inbox", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const me = req.user!.userId;

    // get all messages involving this user
    const msgs = await prisma.message.findMany({
      where: { OR: [{ senderId: me }, { receiverId: me }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, content: true, isRead: true, createdAt: true,
        senderId: true, receiverId: true,
        sender: { select: { id: true, name: true, profilePicture: true } },
        receiver: { select: { id: true, name: true, profilePicture: true } },
      },
    });

    // group by the other party, keep only the latest message per thread
    const threads = new Map<string, typeof msgs[0]>();
    for (const m of msgs) {
      const otherId = m.senderId === me ? m.receiverId : m.senderId;
      if (!threads.has(otherId)) threads.set(otherId, m);
    }

    // build response: include unread count per thread
    const result = await Promise.all(
      Array.from(threads.entries()).map(async ([otherId, latest]) => {
        const unread = await prisma.message.count({
          where: { senderId: otherId, receiverId: me, isRead: false },
        });
        const other = latest.senderId === me ? latest.receiver : latest.sender;
        return { otherId, other, latest, unread };
      })
    );

    // sort by latest message date
    result.sort((a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime());

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/messages/unread-count  — for notification badge
router.get("/unread-count", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.message.count({
      where: { receiverId: req.user!.userId, isRead: false },
    });
    return res.json({ count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/messages  — send a message
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content } = req.body as { receiverId: string; content: string };
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ error: "receiverId and content are required" });
    }

    const me = req.user!.userId;
    if (me === receiverId) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    // students can only message their track instructor
    if (req.user!.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { userId: me },
        select: { track: true },
      });
      if (!student) return res.status(404).json({ error: "Student record not found" });

      const instructor = await prisma.user.findFirst({
        where: { id: receiverId, role: "MENTOR", isActive: true },
      });
      if (!instructor) {
        return res.status(403).json({ error: "You can only message your track instructor" });
      }
      // Verify this instructor is the current one for the student's track
      const currentInstructor = await getCurrentInstructorForTrack(student.track);
      if (!currentInstructor || currentInstructor.id !== receiverId) {
        return res.status(403).json({ error: "You can only message your track instructor" });
      }
    }

    const message = await prisma.message.create({
      data: { senderId: me, receiverId, content: content.trim() },
      select: {
        id: true, content: true, isRead: true, createdAt: true,
        senderId: true, receiverId: true,
        sender: { select: { name: true, profilePicture: true } },
      },
    });

    // Notify recipient
    const sender = await prisma.user.findUnique({ where: { id: me }, select: { name: true } });
    await createNotification({
      userId: receiverId,
      message: `New message from ${sender?.name ?? "someone"}: "${content.trim().slice(0, 60)}${content.trim().length > 60 ? "…" : ""}"`,
      link: req.user!.role === "STUDENT" ? "/instructor/messages" : "/student/messages",
    });

    return res.status(201).json(message);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/messages/broadcast  (instructor: send to all students on their track)
router.post("/broadcast", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const { content, track: reqTrack } = req.body as { content?: string; track?: string };
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    const instructor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true, track: true } });
    const track = reqTrack?.trim() || instructor?.track;
    if (!track) return res.status(400).json({ error: "Track is required" });

    const broadcast = await prisma.broadcast.create({
      data: { instructorId: req.user!.userId, track, content: content.trim() },
    });

    // Notify all students on this track (in-app)
    const students = await prisma.student.findMany({
      where: { track },
      include: { user: { select: { id: true } } },
    });
    await Promise.all(
      students
        .filter((s) => s.user?.id)
        .map((s) => createNotification({ userId: s.user!.id!, message: `${instructor?.name ?? "Your instructor"}: ${content.trim().slice(0, 80)}`, link: "/student/messages" }))
    ).catch(() => {});

    // Notify all admins
    notifyAdmins(`${instructor?.name ?? "Instructor"} sent a class broadcast to ${track}: "${content.trim().slice(0, 60)}"`, "/instructor/messages").catch(() => {});

    return res.status(201).json(broadcast);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/messages/broadcasts  (get broadcasts relevant to current user)
router.get("/broadcasts", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let broadcasts;
    if (req.user!.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { userId: req.user!.userId }, select: { track: true } });
      if (!student) return res.json([]);
      broadcasts = await prisma.broadcast.findMany({
        where: { track: student.track },
        include: { instructor: { select: { name: true, profilePicture: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } else if (req.user!.role === "MENTOR") {
      const instructor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { track: true } });
      broadcasts = await prisma.broadcast.findMany({
        where: { track: instructor?.track ?? "" },
        include: { instructor: { select: { name: true, profilePicture: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } else {
      broadcasts = await prisma.broadcast.findMany({
        include: { instructor: { select: { name: true, profilePicture: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }
    return res.json(broadcasts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
