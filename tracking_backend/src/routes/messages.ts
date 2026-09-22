import { Router, type Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { getCurrentInstructorForTrack } from "./track-assignments";
import { createNotification, notifyAdmins } from "./notifications";
import { emitToRole, emitToUser, isUserOnline } from "../lib/messaging-socket";

const router = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

/** IDs of the two users in a thread, sorted so A-B === B-A */
function threadKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

async function canAccessConversation(me: string, role: string, other: string) {
  if (me === other) return false;
  const target = await prisma.user.findFirst({
    where: { id: other, isActive: true },
    select: { id: true, role: true },
  });
  if (!target) return false;
  if (role === "ADMIN") return target.role === "MENTOR" || target.role === "STUDENT";
  if (role === "MENTOR") {
    if (target.role === "ADMIN") return true;
    if (target.role !== "STUDENT") return false;
    return Boolean(await prisma.student.findFirst({ where: { userId: other, isArchived: false }, select: { id: true } }));
  }
  if (role === "STUDENT") {
    if (target.role !== "MENTOR") return false;
    const student = await prisma.student.findFirst({
      where: { userId: me, isArchived: false },
      select: { id: true, track: true },
    });
    if (!student) return false;
    const assigned = await getCurrentInstructorForTrack(student.track, student.id);
    return assigned?.id === other;
  }
  return false;
}

async function conversationWhere(me: string, role: string, other: string) {
  if (role === "STUDENT") return { supportStudentId: me };
  const target = await prisma.user.findUnique({ where: { id: other }, select: { role: true } });
  if (target?.role === "STUDENT") return { supportStudentId: other };
  return {
    OR: [
      { senderId: me, receiverId: other },
      { senderId: other, receiverId: me },
    ],
  };
}

function messagePageForRole(role: string) {
  return role === "STUDENT" ? "/student/messages" : "/instructor/messages";
}

// ─── GET /api/messages/contacts
//     Instructor → list students on their track
//     Admin → list all instructors + students
router.get("/contacts", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    let where: Record<string, unknown> = {};
    if (req.user!.role === "MENTOR") {
      const [students, admins] = await Promise.all([
        prisma.student.findMany({
          where: { isArchived: false },
          include: { user: { select: { id: true, name: true, profilePicture: true, isActive: true } } },
          orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
          where: { role: "ADMIN", isActive: true, id: { not: me } },
          select: { id: true, name: true, role: true, track: true, profilePicture: true },
          orderBy: { name: "asc" },
        }),
      ]);
      const contacts = students
        .filter((s) => s.user?.isActive && s.user.id !== me)
        .map((s) => ({ id: s.user!.id, name: s.name, role: "STUDENT", track: s.track, profilePicture: s.user!.profilePicture }));
      return res.json([...admins, ...contacts]);
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
      select: { id: true, track: true },
    });
    if (!student) return res.status(404).json({ error: "Student record not found" });

    // Use track assignment table for the authoritative instructor
    const assignedInstructor = await getCurrentInstructorForTrack(student.track, student.id);
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
    if (!(await canAccessConversation(me, req.user!.role, other))) {
      return res.status(403).json({ error: "You cannot access this conversation" });
    }

    const latestMessages = await prisma.message.findMany({
      where: await conversationWhere(me, req.user!.role, other),
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true, content: true, isRead: true, deliveredAt: true, readAt: true, createdAt: true,
        senderId: true, receiverId: true, supportStudentId: true,
        sender: { select: { name: true, role: true, profilePicture: true } },
        reads: { select: { readAt: true, user: { select: { id: true, name: true, role: true } } } },
      },
    });
    return res.json(latestMessages.reverse());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Mark messages as seen only when the client is actively displaying the thread.
router.post("/thread/:userId/read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    const other = req.params.userId;
    if (!(await canAccessConversation(me, req.user!.role, other))) {
      return res.status(403).json({ error: "You cannot access this conversation" });
    }
    const unread = await prisma.message.findMany({
      where: {
        ...(await conversationWhere(me, req.user!.role, other)),
        senderId: { not: me },
        reads: { none: { userId: me } },
      },
      select: { id: true, senderId: true, supportStudentId: true },
    });
    if (unread.length === 0) return res.json({ updated: 0 });
    const readAt = new Date();
    const messageIds = unread.map((message) => message.id);
    const reader = await prisma.user.findUnique({ where: { id: me }, select: { id: true, name: true, role: true } });
    await prisma.$transaction([
      prisma.messageRead.createMany({
        data: messageIds.map((messageId) => ({ messageId, userId: me, readAt })),
        skipDuplicates: true,
      }),
      prisma.message.updateMany({ where: { id: { in: messageIds }, readAt: null }, data: { isRead: true, readAt } }),
      prisma.message.updateMany({ where: { id: { in: messageIds }, deliveredAt: null }, data: { deliveredAt: readAt } }),
    ]);
    const receipt = { messageIds, readAt: readAt.toISOString(), reader };
    for (const senderId of new Set(unread.map((message) => message.senderId))) {
      emitToUser(senderId, "messages:read", receipt);
    }
    if (unread.some((message) => message.supportStudentId)) {
      emitToRole("ADMIN", "messages:read", receipt);
      emitToRole("MENTOR", "messages:read", receipt);
    }
    emitToUser(me, "messages:unread-changed", {});
    return res.json({ updated: messageIds.length, readAt: readAt.toISOString() });
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

    const activeStudents = await prisma.student.findMany({
      where: { isArchived: false, user: { isActive: true } },
      select: { name: true, track: true, user: { select: { id: true, name: true, profilePicture: true } } },
    });
    const studentContacts = activeStudents
      .filter((student) => student.user)
      .map((student) => ({ id: student.user!.id, name: student.name, profilePicture: student.user!.profilePicture }));
    const studentUserIds = studentContacts.map((student) => student.id);

    const msgs = await prisma.message.findMany({
      where: { OR: [{ senderId: me }, { receiverId: me }, { supportStudentId: { in: studentUserIds } }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, content: true, isRead: true, deliveredAt: true, readAt: true, createdAt: true,
        senderId: true, receiverId: true, supportStudentId: true,
        sender: { select: { id: true, name: true, role: true, profilePicture: true } },
        receiver: { select: { id: true, name: true, profilePicture: true } },
        reads: { where: { userId: me }, select: { userId: true } },
      },
    });

    // group by the other party, keep only the latest message per thread
    const threads = new Map<string, typeof msgs[0]>();
    for (const m of msgs) {
      const otherId = m.supportStudentId ?? (m.senderId === me ? m.receiverId : m.senderId);
      if (!threads.has(otherId)) threads.set(otherId, m);
    }

    // build response: include unread count per thread
    const unreadByThread = new Map<string, number>();
    for (const message of msgs) {
      const threadId = message.supportStudentId ?? (message.senderId === me ? message.receiverId : message.senderId);
      const shouldCount = req.user!.role === "ADMIN" ? message.senderId !== me : message.receiverId === me;
      if (shouldCount && message.reads.length === 0) {
        unreadByThread.set(threadId, (unreadByThread.get(threadId) ?? 0) + 1);
      }
    }
    const contactMap = new Map(studentContacts.map((student) => [student.id, student]));
    const directIds = Array.from(threads.keys()).filter((id) => !contactMap.has(id));
    const directContacts = await prisma.user.findMany({
      where: { id: { in: directIds } },
      select: { id: true, name: true, profilePicture: true },
    });
    for (const contact of directContacts) contactMap.set(contact.id, contact);
    const result = Array.from(threads.entries()).map(([otherId, latest]) => {
        const unread = unreadByThread.get(otherId) ?? 0;
        const other = contactMap.get(otherId) ?? (latest.senderId === me ? latest.receiver : latest.sender);
        return { otherId, other, latest, unread };
      });

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
    const me = req.user!.userId;
    let visibility: Record<string, unknown> = { receiverId: me };
    if (req.user!.role === "STUDENT") {
      visibility = { supportStudentId: me };
    } else if (req.user!.role === "ADMIN") {
      const students = await prisma.student.findMany({ where: { isArchived: false }, select: { userId: true } });
      visibility = { OR: [{ receiverId: me }, { supportStudentId: { in: students.flatMap((student) => student.userId ? [student.userId] : []) } }] };
    }
    const count = await prisma.message.count({
      where: { ...visibility, senderId: { not: me }, reads: { none: { userId: me } } },
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
    if (!(await canAccessConversation(me, req.user!.role, receiverId))) {
      return res.status(403).json({ error: "You cannot message this user" });
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { role: true } });
    const supportStudentId = req.user!.role === "STUDENT" ? me : receiver?.role === "STUDENT" ? receiverId : null;
    const deliveredAt = isUserOnline(receiverId) ? new Date() : null;

    const message = await prisma.message.create({
      data: { senderId: me, receiverId, supportStudentId, content: content.trim(), deliveredAt },
      select: {
        id: true, content: true, isRead: true, deliveredAt: true, readAt: true, createdAt: true,
        senderId: true, receiverId: true, supportStudentId: true,
        sender: { select: { name: true, role: true, profilePicture: true } },
        reads: { select: { readAt: true, user: { select: { id: true, name: true, role: true } } } },
      },
    });

    emitToUser(receiverId, "message:new", message);
    emitToUser(receiverId, "messages:unread-changed", {});
    emitToUser(me, "message:sent", message);
    if (supportStudentId) {
      emitToRole("ADMIN", "message:new", message);
      emitToRole("MENTOR", "message:new", message);
    }

    // Notification creation must not delay the chat response.
    void createNotification({
      userId: receiverId,
      message: `New message from ${message.sender.name}: "${content.trim().slice(0, 60)}${content.trim().length > 60 ? "…" : ""}"`,
      link: messagePageForRole(receiver?.role ?? "STUDENT"),
    }).catch((error) => console.error("Failed to create message notification", error));

    return res.status(201).json(message);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/messages/track-students?track=XYZ  (instructor/admin: get students for broadcast UI)
router.get("/track-students", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const track = (req.query.track as string)?.trim();
    if (!track) return res.status(400).json({ error: "track param required" });
    const students = await prisma.student.findMany({
      where: { track, isArchived: false },
      include: { user: { select: { id: true, isActive: true } } },
      orderBy: { name: "asc" },
    });
    return res.json(
      students
        .filter((s) => s.user?.isActive)
        .map((s) => ({ id: s.id, name: s.name, userId: s.user!.id, studentCode: s.studentCode }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/messages/broadcast  (instructor: send to selected students on their track)
router.post("/broadcast", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "MENTOR" && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Instructors and admins only" });
    }
    const { content, track: reqTrack, targetUserIds } = req.body as { content?: string; track?: string; targetUserIds?: string[] };
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    const instructor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true, track: true } });
    const track = reqTrack?.trim() || instructor?.track;
    if (!track) return res.status(400).json({ error: "Track is required" });

    const broadcast = await prisma.broadcast.create({
      data: {
        instructorId: req.user!.userId,
        track,
        content: content.trim(),
        targetUserIds: targetUserIds && targetUserIds.length > 0 ? targetUserIds : [],
      },
    });

    // Determine who to notify: specific targets or all on track
    let notifyUserIds: string[] = [];
    if (targetUserIds && targetUserIds.length > 0) {
      notifyUserIds = targetUserIds;
    } else {
      const students = await prisma.student.findMany({
        where: { track, isArchived: false },
        include: { user: { select: { id: true } } },
      });
      notifyUserIds = students.filter((s) => s.user?.id).map((s) => s.user!.id!);
    }

    await Promise.all(
      notifyUserIds.map((uid) => createNotification({ userId: uid, message: `${instructor?.name ?? "Your instructor"}: ${content.trim().slice(0, 80)}`, link: "/student/messages" }))
    ).catch(() => {});

    for (const uid of notifyUserIds) emitToUser(uid, "broadcast:new", broadcast);

    notifyAdmins(`${instructor?.name ?? "Instructor"} sent a broadcast to ${track}: "${content.trim().slice(0, 60)}"`, "/instructor/messages").catch(() => {});

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
      // Show if: targetUserIds is empty (all-track broadcast) OR userId is in targetUserIds
      const all = await prisma.broadcast.findMany({
        where: { track: student.track },
        include: { instructor: { select: { name: true, profilePicture: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      broadcasts = all.filter((b) => b.targetUserIds.length === 0 || b.targetUserIds.includes(req.user!.userId));
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
