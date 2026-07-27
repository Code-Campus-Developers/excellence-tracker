import { Router, type Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, type AuthRequest } from "../middleware/authenticate";

const router = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

/** IDs of the two users in a thread, sorted so A-B === B-A */
function threadKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

// ─── GET /api/messages/instructor
//     Student → find their track instructor's User record
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
      if (instructor.track !== student.track) {
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

    return res.status(201).json(message);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
