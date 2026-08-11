import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import { sendParentWelcomeEmail } from "../lib/email";
import { audit } from "../lib/audit";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function requireAdmin(req: AuthRequest, res: Response): boolean {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Admin only" });
    return false;
  }
  return true;
}

function requireParent(req: AuthRequest, res: Response): boolean {
  if (req.user?.role !== "PARENT") {
    res.status(403).json({ error: "Parent access only" });
    return false;
  }
  return true;
}

// ─── Admin: Create Parent Account ─────────────────────────────────────────────
// POST /admin/parents
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { name, email, phone, studentIds } = req.body as {
    name: string;
    email: string;
    phone?: string;
    studentIds?: string[];
  };

  if (!name || !email) {
    res.status(400).json({ error: "name and email are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  // Generate a temp password
  const tempPassword = `Parent@${Math.random().toString(36).slice(2, 9)}`;
  const passwordHash = await hashPassword(tempPassword);

  const parent = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "PARENT",
      phone: phone?.trim() ?? null,
    },
  });

  // Link students if provided
  if (studentIds && studentIds.length > 0) {
    await prisma.parentStudent.createMany({
      data: studentIds.map((studentId) => ({
        parentId: parent.id,
        studentId,
      })),
      skipDuplicates: true,
    });
  }

  try {
    await sendParentWelcomeEmail({
      to: email,
      name,
      tempPassword,
    });
  } catch (e) {
    console.error("Parent welcome email failed:", e);
  }

  await audit(req, "CREATE_PARENT", { parentId: parent.id, email });

  res.json({
    id: parent.id,
    name: parent.name,
    email: parent.email,
    phone: parent.phone,
    role: parent.role,
    createdAt: parent.createdAt,
    tempPassword, // returned so admin can manually share if email fails
  });
});

// ─── Admin: List All Parents ───────────────────────────────────────────────────
// GET /admin/parents
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const parents = await prisma.user.findMany({
    where: { role: "PARENT" },
    include: {
      parentLinks: {
        include: {
          student: {
            select: { id: true, name: true, studentCode: true, track: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    parents.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      isActive: p.isActive,
      createdAt: p.createdAt,
      children: p.parentLinks.map((l) => l.student),
    }))
  );
});

// ─── Admin: Link Student to Parent ────────────────────────────────────────────
// POST /admin/parents/:id/link/:studentId
router.post("/:id/link/:studentId", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { id: parentId, studentId } = req.params;

  const parent = await prisma.user.findUnique({ where: { id: parentId, role: "PARENT" } });
  if (!parent) { res.status(404).json({ error: "Parent not found" }); return; }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    create: { parentId, studentId },
    update: {},
  });

  res.json({ success: true, message: `${student.name} linked to ${parent.name}` });
});

// ─── Admin: Unlink Student from Parent ────────────────────────────────────────
// DELETE /admin/parents/:id/unlink/:studentId
router.delete("/:id/unlink/:studentId", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { id: parentId, studentId } = req.params;

  await prisma.parentStudent.deleteMany({ where: { parentId, studentId } });

  res.json({ success: true });
});

// ─── Admin: Delete Parent ──────────────────────────────────────────────────────
// DELETE /admin/parents/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  await prisma.parentStudent.deleteMany({ where: { parentId: req.params.id } });
  await prisma.user.delete({ where: { id: req.params.id } });

  res.json({ success: true });
});

// ─── Parent: My Children ──────────────────────────────────────────────────────
// GET /api/parent/children
router.get("/children", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireParent(req, res)) return;

  const links = await prisma.parentStudent.findMany({
    where: { parentId: req.user!.userId },
    include: {
      student: {
        include: {
          evaluations: {
            orderBy: { week: "desc" },
            take: 1,
            select: { week: true, total: true },
          },
          _count: {
            select: {
              attendance: true,
              selfReports: true,
            },
          },
          user: {
            select: { profilePicture: true },
          },
        },
      },
    },
  });

  const children = links.map(({ student }) => {
    const latestEval = student.evaluations[0] ?? null;
    return {
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      track: student.track,
      avatarColor: student.avatarColor,
      profilePicture: student.user?.profilePicture ?? null,
      latestEval,
      attendanceCount: student._count.attendance,
      reportCount: student._count.selfReports,
    };
  });

  res.json(children);
});

// ─── Parent: Child's Evaluations ─────────────────────────────────────────────
// GET /api/parent/child/:studentId/evaluations
router.get("/child/:studentId/evaluations", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireParent(req, res)) return;

  // Verify parent has access to this student
  const link = await prisma.parentStudent.findUnique({
    where: {
      parentId_studentId: {
        parentId: req.user!.userId,
        studentId: req.params.studentId,
      },
    },
  });
  if (!link) { res.status(403).json({ error: "Access denied" }); return; }

  const evaluations = await prisma.evaluation.findMany({
    where: { studentId: req.params.studentId },
    orderBy: { week: "asc" },
  });

  res.json(evaluations);
});

// ─── Parent: Child's Attendance ───────────────────────────────────────────────
// GET /api/parent/child/:studentId/attendance
router.get("/child/:studentId/attendance", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireParent(req, res)) return;

  const link = await prisma.parentStudent.findUnique({
    where: {
      parentId_studentId: {
        parentId: req.user!.userId,
        studentId: req.params.studentId,
      },
    },
  });
  if (!link) { res.status(403).json({ error: "Access denied" }); return; }

  const records = await prisma.attendance.findMany({
    where: { studentId: req.params.studentId },
    orderBy: { date: "desc" },
    take: 60,
  });

  res.json(records);
});

// ─── Parent: Child's Self Reports ─────────────────────────────────────────────
// GET /api/parent/child/:studentId/reports
router.get("/child/:studentId/reports", authenticate, async (req: AuthRequest, res: Response) => {
  if (!requireParent(req, res)) return;

  const link = await prisma.parentStudent.findUnique({
    where: {
      parentId_studentId: {
        parentId: req.user!.userId,
        studentId: req.params.studentId,
      },
    },
  });
  if (!link) { res.status(403).json({ error: "Access denied" }); return; }

  const reports = await prisma.selfReport.findMany({
    where: { studentId: req.params.studentId },
    orderBy: { weekNumber: "desc" },
  });

  res.json(reports);
});

export default router;
