import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /api/evaluations
router.get("/", async (_req: Request, res: Response) => {
  const evals = await prisma.evaluation.findMany({ orderBy: [{ week: "asc" }, { createdAt: "asc" }] });
  res.json(evals);
});

// GET /api/evaluations/student/:studentId
router.get("/student/:studentId", async (req: Request, res: Response) => {
  const evals = await prisma.evaluation.findMany({
    where: { studentId: req.params.studentId },
    orderBy: { week: "asc" },
  });
  res.json(evals);
});

// GET /api/evaluations/week/:week
router.get("/week/:week", async (req: Request, res: Response) => {
  const evals = await prisma.evaluation.findMany({
    where: { week: Number(req.params.week) },
    orderBy: { createdAt: "asc" },
  });
  res.json(evals);
});

// POST /api/evaluations
router.post("/", async (req: Request, res: Response) => {
  const { id, studentId, week, evaluator, scores, total, notes } = req.body as {
    id: string; studentId: string; week: number;
    evaluator?: string; scores: Record<string, number>; total: number; notes?: string;
  };
  if (!id || !studentId || !week || !scores || total === undefined) {
    res.status(400).json({ error: "id, studentId, week, scores and total are required" }); return;
  }
  try {
    const evaluation = await prisma.evaluation.create({
      data: { id, studentId, week, evaluator: evaluator ?? "Mentor Sarah", scores, total, notes: notes ?? "" },
    });
    res.status(201).json(evaluation);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      res.status(409).json({ error: `Student already has an evaluation for week ${week}` }); return;
    }
    if (e.code === "P2003") {
      res.status(404).json({ error: "Student not found" }); return;
    }
    throw err;
  }
});

// DELETE /api/evaluations/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.evaluation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Evaluation not found" });
  }
});

export default router;
