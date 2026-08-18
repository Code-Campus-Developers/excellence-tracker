import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { getCurrentInstructorForTrack } from "./track-assignments";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import {
  sendParentEvaluationEmail,
  sendParentReportStatusEmail,
  sendParentAttendanceEmail,
} from "../lib/email";
import { sendSMSToMany } from "../lib/sms";

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

// Helper — notify all instructors
export async function notifyInstructors(message: string, link?: string) {
  const instructors = await prisma.user.findMany({ where: { role: "MENTOR" }, select: { id: true } });
  await Promise.all(instructors.map((m) => createNotification({ userId: m.id, message, link })));
}

// Helper — notify the currently active track instructor for a student
export async function notifyTrackInstructor(studentId: string, message: string, link?: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { track: true } });
  if (!student?.track) return;
  const instructor = await getCurrentInstructorForTrack(student.track);
  if (instructor) await createNotification({ userId: instructor.id, message, link });
}

// Helper — generic: call a callback for each parent linked to a student
export async function notifyParentsOfStudent(
  studentId: string,
  callback: (parent: { id: string; name: string; email: string }) => Promise<void>
) {
  const links = await prisma.parentStudent.findMany({
    where: { studentId },
    include: { parent: { select: { id: true, name: true, email: true } } },
  });
  await Promise.all(links.map((l) => callback(l.parent)));
}

// ─── Parent Notification Helpers ──────────────────────────────────────────────

/** Fetch all parents linked to a student */
async function getParentsOfStudent(studentId: string) {
  const links = await prisma.parentStudent.findMany({
    where: { studentId },
    include: { parent: { select: { id: true, name: true, email: true, phone: true } } },
  });
  return links.map((l) => l.parent);
}

/** Email all parents when their child gets a new evaluation */
export async function notifyParentsEvaluation(opts: {
  studentId: string;
  studentName: string;
  week: number;
  total: number;
  evaluator: string;
}) {
  try {
    const parents = await getParentsOfStudent(opts.studentId);
    await Promise.all(
      parents.map((p) =>
        sendParentEvaluationEmail({
          to: p.email,
          parentName: p.name,
          studentName: opts.studentName,
          week: opts.week,
          total: opts.total,
          evaluator: opts.evaluator,
        })
      )
    );
    // SMS
    const phones = parents.map((p) => p.phone);
    await sendSMSToMany(phones, `Code Campus: ${opts.studentName}'s Week ${opts.week} evaluation is ready. Score: ${opts.total}/100. Log in to view details.`);
  } catch (err) {
    console.error("notifyParentsEvaluation failed:", err);
  }
}

/** Email all parents when their child's self-report is verified/rejected */
export async function notifyParentsReportStatus(opts: {
  studentId: string;
  studentName: string;
  week: number;
  status: "VERIFIED" | "REJECTED";
}) {
  try {
    const parents = await getParentsOfStudent(opts.studentId);
    await Promise.all(
      parents.map((p) =>
        sendParentReportStatusEmail({
          to: p.email,
          parentName: p.name,
          studentName: opts.studentName,
          week: opts.week,
          status: opts.status,
        })
      )
    );
    // SMS
    const phones = parents.map((p) => p.phone);
    const statusWord = opts.status === "VERIFIED" ? "approved ✅" : "needs revision ❌";
    await sendSMSToMany(phones, `Code Campus: ${opts.studentName}'s Week ${opts.week} self-report has been ${statusWord}. Log in to view.`);
  } catch (err) {
    console.error("notifyParentsReportStatus failed:", err);
  }
}

/** Email all parents when their child clocks in or out */
export async function notifyParentsAttendance(opts: {
  studentId: string;
  studentName: string;
  action: "clock_in" | "clock_out";
  time: string;
  durationMin?: number | null;
}) {
  try {
    const parents = await getParentsOfStudent(opts.studentId);
    await Promise.all(
      parents.map((p) =>
        sendParentAttendanceEmail({
          to: p.email,
          parentName: p.name,
          studentName: opts.studentName,
          action: opts.action,
          time: opts.time,
          durationMin: opts.durationMin,
        })
      )
    );
    // SMS
    const phones = parents.map((p) => p.phone);
    const msg = opts.action === "clock_in"
      ? `Code Campus: ${opts.studentName} clocked IN at ${opts.time}.`
      : `Code Campus: ${opts.studentName} clocked OUT at ${opts.time}${opts.durationMin ? ` (${opts.durationMin} mins)` : ""}.`;
    await sendSMSToMany(phones, msg);
  } catch (err) {
    console.error("notifyParentsAttendance failed:", err);
  }
}

/** In-app notification to all parents linked to a student */
export async function notifyParentsInApp(studentId: string, message: string, link = "/parent") {
  try {
    const parents = await getParentsOfStudent(studentId);
    await Promise.all(parents.map((p) => createNotification({ userId: p.id, message, link })));
  } catch (err) {
    console.error("notifyParentsInApp failed:", err);
  }
}

