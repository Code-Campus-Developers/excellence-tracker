import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, authorize } from "../middleware/authenticate";
import { hashPassword } from "../lib/auth";
import { sendStudentWelcomeEmail } from "../lib/email";
import { notifyAdmins, notifyMentors } from "./notifications";

const router = Router();
router.use(authenticate);

// POST /api/students/enroll — Mentor or Admin creates a student with a user account
router.post("/enroll", authorize("MENTOR", "ADMIN"), async (req: Request, res: Response) => {
  const { name, email, track } = req.body as { name: string; email: string; track: string };
  if (!name || !email || !track) {
    res.status(400).json({ error: "name, email and track are required" }); return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

  const tempPassword = Math.random().toString(36).slice(-8) + "S1!";
  const passwordHash = await hashPassword(tempPassword);
  const studentId = `s_${Date.now()}`;

  const user = await prisma.user.create({
    data: {
      name, email, passwordHash, role: "STUDENT",
      student: { create: { id: studentId, name, email, track, avatarColor: "#16a34a" } },
    },
    include: { student: true },
  });

  try { await sendStudentWelcomeEmail({ to: email, name, track }); }
  catch (err) { console.error("Welcome email failed:", err); }

  try {
    await notifyAdmins(`New student enrolled: ${name} (${track})`, "/admin/manage");
    await notifyMentors(`New student enrolled: ${name} (${track})`, "/mentor/students");
  } catch { /* silent */ }

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    student: user.student,
    tempPassword,
  });
});

// GET /api/students
router.get("/", async (_req: Request, res: Response) => {
  const students = await prisma.student.findMany({ orderBy: { name: "asc" } });
  res.json(students);
});

// GET /api/students/:id
router.get("/:id", async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  res.json(student);
});

// POST /api/students
router.post("/", async (req: Request, res: Response) => {
  const { id, name, email, track, avatarColor } = req.body as {
    id: string; name: string; email: string; track: string; avatarColor?: string;
  };
  if (!id || !name || !email || !track) {
    res.status(400).json({ error: "id, name, email and track are required" }); return;
  }
  const student = await prisma.student.create({
    data: { id, name, email, track, avatarColor: avatarColor ?? "#16a34a" },
  });
  res.status(201).json(student);
});

// PUT /api/students/:id
router.put("/:id", async (req: Request, res: Response) => {
  const { name, email, track, avatarColor } = req.body as {
    name?: string; email?: string; track?: string; avatarColor?: string;
  };
  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(email && { email }), ...(track && { track }), ...(avatarColor && { avatarColor }) },
    });
    res.json(student);
  } catch {
    res.status(404).json({ error: "Student not found" });
  }
});

// DELETE /api/students/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.student.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Student not found" });
  }
});

export default router;
