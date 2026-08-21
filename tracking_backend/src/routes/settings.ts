import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate, authorize, AuthRequest } from "../middleware/authenticate";

const router = Router();

// GET /api/settings — any authenticated user
router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  rows.forEach((r) => (settings[r.key] = r.value));
  res.json(settings);
});

// PUT /api/settings — admin and instructor (MENTOR) can update
router.put("/", authenticate, authorize("ADMIN", "MENTOR"), async (req: AuthRequest, res: Response) => {
  const updates = req.body as Record<string, string>;
  const ops = Object.entries(updates).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );
  await Promise.all(ops);
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  rows.forEach((r) => (settings[r.key] = r.value));
  res.json(settings);
});

// PUT /admin/settings — admin and instructor (MENTOR) can update (mounted under /admin)
export const adminSettingsRouter = Router();
adminSettingsRouter.use(authenticate, authorize("ADMIN", "MENTOR"));

adminSettingsRouter.get("/", async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  rows.forEach((r) => (settings[r.key] = r.value));
  res.json(settings);
});

adminSettingsRouter.put("/", async (req: AuthRequest, res: Response) => {
  const updates = req.body as Record<string, string>;
  const ops = Object.entries(updates).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );
  await Promise.all(ops);
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  rows.forEach((r) => (settings[r.key] = r.value));
  res.json(settings);
});

// adminSettingsRouter is exported as named export
adminSettingsRouter.get("/", async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  rows.forEach((r) => (settings[r.key] = r.value));
  res.json(settings);
});

adminSettingsRouter.put("/", async (req: AuthRequest, res: Response) => {
  const updates = req.body as Record<string, string>;
  const ops = Object.entries(updates).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );
  await Promise.all(ops);
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  rows.forEach((r) => (settings[r.key] = r.value));
  res.json(settings);
});

// ─── GET /api/settings/holidays ───────────────────────────────────────────────
router.get("/holidays", authenticate, async (_req: AuthRequest, res: Response) => {
  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  res.json(holidays);
});

// ─── POST /api/settings/holidays ──────────────────────────────────────────────
router.post("/holidays", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const { date, name } = req.body as { date?: string; name?: string };
  if (!date || !name?.trim()) { res.status(400).json({ error: "date and name are required" }); return; }
  try {
    const holiday = await prisma.holiday.create({ data: { date: new Date(date), name: name.trim() } });
    res.json(holiday);
  } catch {
    res.status(409).json({ error: "A holiday already exists on that date" });
  }
});

// ─── DELETE /api/settings/holidays/:id ────────────────────────────────────────
router.delete("/holidays/:id", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  await prisma.holiday.delete({ where: { id: req.params.id } }).catch(() => {});
  res.status(204).send();
});

export default router;
