import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

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
