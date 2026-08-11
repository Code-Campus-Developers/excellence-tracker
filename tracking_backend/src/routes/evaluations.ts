import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { createNotification, notifyAdmins, notifyParentsEvaluation } from "./notifications";
import { sendEvaluationEmail } from "../lib/email";
import { audit } from "../lib/audit";

const router = Router();
router.use(authenticate);

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
    // Notify student + send email
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: true },
      });
      if (student?.user) {
        await createNotification({
          userId: student.user.id,
          message: `Your Week ${week} evaluation is ready — you scored ${total}/100`,
          link: "/dashboard",
        });
        await sendEvaluationEmail({
          to: student.user.email,
          name: student.user.name,
          week,
          total,
          evaluator: evaluator ?? "Mentor",
        });
      }
      // Notify all admins about the evaluation
      await notifyAdmins(
        `${student?.name ?? "A student"} scored ${total}/100 in Week ${week} evaluation`,
        "/admin"
      );
      // Notify parents
      if (student) {
        await notifyParentsEvaluation({
          studentId: student.id,
          studentName: student.name,
          week,
          total,
          evaluator: evaluator ?? "Mentor",
        });
      }
    } catch (err) {
      console.error("Notification/email after eval failed:", err);
    }
    res.status(201).json(evaluation);
    await audit(req, "EVALUATION_SUBMITTED", { studentId, week, total, evaluator: evaluator ?? "Mentor" });
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
