import { Router, Request, Response } from "express";
import prisma, { generateStudentCode } from "../lib/prisma";
import {
  hashPassword,
  comparePassword,
  signToken,
  generateResetToken,
} from "../lib/auth";
import { sendPasswordResetEmail, sendStudentWelcomeEmail } from "../lib/email";
import { notifyAdmins } from "./notifications";
import { audit } from "../lib/audit";
import { authenticate, AuthRequest } from "../middleware/authenticate";

const router = Router();

// POST /auth/register  (students only)
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password, track } = req.body as {
    name: string; email: string; password: string; track: string;
  };
  if (!name || !email || !password || !track) {
    res.status(400).json({ error: "name, email, password and track are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(password);
  if (!strongPassword) {
    res.status(400).json({ error: "Password must contain uppercase, lowercase, a number, and a symbol (e.g. Abc@1234)" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const studentId = `s_${Date.now()}`;
  const studentCode = await generateStudentCode();

  const user = await prisma.user.create({
    data: {
      name, email, passwordHash, role: "STUDENT",
      student: { create: { id: studentId, studentCode, name, email, track, avatarColor: "#16a34a" } },
    },
    include: { student: true },
  });

  const token = signToken({ userId: user.id, role: user.role });

  try {
    await sendStudentWelcomeEmail({ to: email, name, track });
  } catch (err) {
    console.error("Welcome email failed:", err);
  }

  // Notify admins about new registration
  try {
    await notifyAdmins(`New student registered: ${name} (${track})`, "/admin/manage");
  } catch { /* silent */ }

  await audit(req, "STUDENT_REGISTERED", { name, email, track });

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, track: user.track ?? null, profilePicture: user.profilePicture ?? null },
    student: user.student,
  });
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { student: true },
  });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Your account has been restricted. Please contact your instructor or admin." });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });

  await audit(req, "LOGIN", { email: user.email, role: user.role });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, track: user.track ?? null, profilePicture: user.profilePicture ?? null },
    student: user.student ?? null,
  });
});

// GET /auth/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { student: true },
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, track: user.track ?? null, profilePicture: user.profilePicture ?? null },
    student: user.student ?? null,
  });
});

// POST /auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  if (!email) { res.status(400).json({ error: "email is required" }); return; }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond 200 to prevent user enumeration
  if (!user) { res.json({ message: "If that email exists, a reset link has been sent." }); return; }

  const token = generateResetToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetExpires: expires },
  });

  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, token });
  } catch (err) {
    console.error("Email send failed:", err);
  }

  res.json({ message: "If that email exists, a reset link has been sent." });
});

// POST /auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };
  if (!token || !password) {
    res.status(400).json({ error: "token and password are required" }); return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" }); return;
  }

  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetExpires: { gt: new Date() } },
  });
  if (!user) {
    res.status(400).json({ error: "Reset link is invalid or has expired" }); return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetExpires: null },
  });

  res.json({ message: "Password updated successfully" });
});

// POST /auth/change-password (authenticated)
router.post("/change-password", authenticate, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string; newPassword: string;
  };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" }); return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" }); return;
  }
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(newPassword);
  if (!strongPassword) {
    res.status(400).json({ error: "Password must contain uppercase, lowercase, a number, and a symbol" }); return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await audit(req, "PASSWORD_CHANGED", { userId: user.id });

  res.json({ message: "Password changed successfully" });
});

// PUT /auth/profile — update name, email, track, profilePicture
router.put("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, email, track, profilePicture } = req.body as {
    name?: string; email?: string; track?: string; profilePicture?: string;
  };
  const userId = req.user!.userId;

  // Check email uniqueness if changing
  if (email) {
    const existing = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
    if (existing) { res.status(409).json({ error: "Email already in use" }); return; }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(track !== undefined && { track }),
      ...(profilePicture !== undefined && { profilePicture }),
    },
    select: { id: true, name: true, email: true, role: true, track: true, profilePicture: true },
  });

  // Also update student record if name/email/track changed
  if (name || email || track) {
    await prisma.student.updateMany({
      where: { userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(track && { track }),
      },
    }).catch(() => {});
  }

  res.json({ user: updated });
});

export default router;
