import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/authenticate";

const router = Router();
router.use(authenticate);

// GET /api/notifications — current user's notifications
router.get("/", async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(notifications);
});

// DELETE /api/notifications/clear — delete all for current user
router.delete("/clear", async (req: AuthRequest, res: Response) => {
  await prisma.notification.deleteMany({ where: { userId: req.user!.userId } });
  res.json({ message: "All notifications cleared" });
});

// DELETE /api/notifications/:id — delete one
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Notification not found" });
  }
});
router.put("/read-all", async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: "All marked as read" });
});

export default router;

// Helper — create a notification for a user
export async function createNotification(opts: {
  userId: string;
  message: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      message: opts.message,
      link: opts.link ?? "/",
    },
  });
}

// Helper — notify all admins
export async function notifyAdmins(message: string, link?: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(admins.map((a) => createNotification({ userId: a.id, message, link })));
}

// Helper — notify all mentors
export async function notifyMentors(message: string, link?: string) {
  const mentors = await prisma.user.findMany({ where: { role: "MENTOR" }, select: { id: true } });
  await Promise.all(mentors.map((m) => createNotification({ userId: m.id, message, link })));
}
