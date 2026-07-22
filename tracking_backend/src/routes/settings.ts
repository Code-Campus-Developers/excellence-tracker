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

// PUT /admin/settings — admin only (mounted under /admin)
export const adminSettingsRouter = Router();
adminSettingsRouter.use(authenticate, authorize("ADMIN"));

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

export default router;
