import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { hashPassword, generateResetToken } from "../lib/auth";
import { sendMentorWelcomeEmail, sendStudentWelcomeEmail } from "../lib/email";
import { authenticate, authorize, AuthRequest } from "../middleware/authenticate";
import { notifyAdmins, notifyMentors } from "./notifications";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

// GET /admin/mentors
router.get("/mentors", async (_req: AuthRequest, res: Response) => {
  const mentors = await prisma.user.findMany({
    where: { role: "MENTOR" },
    select: { id: true, name: true, email: true, track: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(mentors);
});

// POST /admin/mentors — create mentor + send welcome email
router.post("/mentors", async (req: AuthRequest, res: Response) => {
  const { name, email, track } = req.body as { name: string; email: string; track?: string };
  if (!name || !email) {
    res.status(400).json({ error: "name and email are required" }); return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

  const tempPassword = Math.random().toString(36).slice(-8) + "C1!";
  const passwordHash = await hashPassword(tempPassword);
  const mentor = await prisma.user.create({
    data: { name, email, passwordHash, role: "MENTOR", track: track ?? null },
    select: { id: true, name: true, email: true, track: true, createdAt: true },
  });

  try { await sendMentorWelcomeEmail({ to: email, name, tempPassword, loginUrl: `${process.env.APP_URL}/mentor-login` }); }
  catch (err) { console.error("Welcome email failed:", err); }

  try { await notifyAdmins(`New mentor account created: ${name}`, "/admin/manage"); }
  catch { /* silent */ }

  res.status(201).json({ mentor, tempPassword });
});

// DELETE /admin/mentors/:id
router.delete("/mentors/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id, role: "MENTOR" } });
    res.status(204).send();
  } catch { res.status(404).json({ error: "Mentor not found" }); }
});

// GET /admin/students
router.get("/students", async (_req: AuthRequest, res: Response) => {
  const students = await prisma.student.findMany({
    include: { _count: { select: { evaluations: true } } },
    orderBy: { name: "asc" },
  });
  res.json(students);
});

// POST /admin/students — create student account + send welcome email
router.post("/students", async (req: AuthRequest, res: Response) => {
  const { name, email, track } = req.body as {
    name: string; email: string; track: string;
  };
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

  try { await sendMentorWelcomeEmail({ to: email, name, tempPassword, loginUrl: `${process.env.APP_URL}/login` }); }
  catch (err) { console.error("Welcome email failed:", err); }

  try {
    await notifyAdmins(`New student added: ${name} (${track})`, "/admin/manage");
    await notifyMentors(`New student enrolled: ${name} (${track})`, "/mentor/students");
  } catch { /* silent */ }

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    student: user.student,
    tempPassword,
  });
});

// DELETE /admin/students/:id
router.delete("/students/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.student.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch { res.status(404).json({ error: "Student not found" }); }
});

// GET /admin/users — all users with roles
router.get("/users", async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, track: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// POST /admin/users/:id/reset-password — generate temp password + send email
router.post("/users/:id/reset-password", async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const tempPassword = Math.random().toString(36).slice(-8) + "Cc1!";
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetToken: null, resetExpires: null } });

  try {
    await sendMentorWelcomeEmail({ to: user.email, name: user.name, tempPassword,
      loginUrl: `${process.env.APP_URL}/${user.role === 'MENTOR' ? 'mentor-login' : user.role === 'ADMIN' ? 'admin-login' : 'login'}` });
  } catch (err) { console.error("Reset email failed:", err); }

  res.json({ message: `Password reset — new credentials sent to ${user.email}`, tempPassword });
});

// POST /admin/users/:id/toggle-active — restrict or unrestrict a user
router.post("/users/:id/toggle-active", async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.role === "ADMIN") { res.status(403).json({ error: "Cannot restrict admin accounts" }); return; }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: !user.isActive },
    select: { id: true, isActive: true },
  });
  res.json(updated);
});

export default router;
