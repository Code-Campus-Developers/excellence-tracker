import { Router, type Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import prisma, { generateStudentCode } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { authenticate, authorize, type AuthRequest } from "../middleware/authenticate";
import { sendStudentWelcomeEmail, sendInstructorWelcomeEmail, sendParentWelcomeEmail } from "../lib/email";
import { notifyAdmins } from "./notifications";

const router = Router();

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$!%&*";
  const all = upper + lower + digits + symbols;
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)];
  const pw = [rand(upper), rand(lower), rand(digits), rand(symbols)];
  for (let i = 4; i < 10; i++) pw.push(rand(all));
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join("");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/csv"];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xls|xlsx)$/i)) cb(null, true);
    else cb(new Error("Only CSV, XLS, or XLSX files are allowed"));
  },
});

// Helper: get name from row (supports firstName+lastName or name/fullname)
function parseName(row: Record<string, string>) {
  const firstName = (row["First Name"] || row["firstName"] || row["first_name"] || "").toString().trim();
  const lastName = (row["Last Name"] || row["lastName"] || row["last_name"] || "").toString().trim();
  const fullName = (row["Name"] || row["name"] || row["Full Name"] || row["fullname"] || "").toString().trim();
  if (firstName && lastName) return { name: `${firstName} ${lastName}` };
  if (fullName) return { name: fullName };
  return null;
}

// ─── POST /admin/bulk-import/students ─────────────────────────────────────────
router.post("/students", authenticate, authorize("ADMIN", "MENTOR"), upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    if (rows.length === 0) return res.status(400).json({ error: "File is empty or has no data rows" });
    if (rows.length > 200) return res.status(400).json({ error: "Maximum 200 rows per import" });

    const results: Array<{ row: number; name: string; email: string; status: "success" | "failed"; error?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nameData = parseName(row);
      const email = (row["Email"] || row["email"] || row["Email Address"] || "").toString().trim().toLowerCase();
      const track = (row["Track"] || row["track"] || row["Programme"] || "").toString().trim();
      const phone = (row["Phone"] || row["phone"] || row["Phone Number"] || "").toString().trim();

      if (!nameData || !email || !track) {
        results.push({ row: i + 2, name: nameData?.name || "(blank)", email: email || "(blank)", status: "failed", error: "First Name, Last Name, Email, and Track are required" });
        continue;
      }
      if (!phone) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Phone number is required" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Invalid email format" });
        continue;
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Email already registered" });
        continue;
      }
      try {
        const password = generatePassword();
        const passwordHash = await hashPassword(password);
        const studentId = `s_${Date.now()}_${i}`;
        const studentCode = await generateStudentCode();
        await prisma.user.create({
          data: {
            name: nameData.name,
            email, passwordHash, role: "STUDENT", phone: phone || null,
            student: { create: { id: studentId, studentCode, name: nameData.name, email, track, avatarColor: "#16a34a" } },
          },
        });
        try { await sendStudentWelcomeEmail({ to: email, name: nameData.name, track, tempPassword: password }); } catch { /* silent */ }
        results.push({ row: i + 2, name: nameData.name, email, status: "success" });
      } catch (err) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    if (successCount > 0) await notifyAdmins(`Bulk import: ${successCount} student(s) created.`, "/admin/manage").catch(() => {});
    return res.json({ total: rows.length, success: successCount, failed: results.filter((r) => r.status === "failed").length, results });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// ─── POST /admin/bulk-import/instructors ──────────────────────────────────────
router.post("/instructors", authenticate, authorize("ADMIN"), upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    if (rows.length === 0) return res.status(400).json({ error: "File is empty" });
    if (rows.length > 100) return res.status(400).json({ error: "Maximum 100 rows per import" });

    const results: Array<{ row: number; name: string; email: string; status: "success" | "failed"; error?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nameData = parseName(row);
      const email = (row["Email"] || row["email"] || "").toString().trim().toLowerCase();
      const track = (row["Track"] || row["track"] || "").toString().trim() || null;
      const phone = (row["Phone"] || row["phone"] || "").toString().trim();

      if (!nameData || !email) {
        results.push({ row: i + 2, name: nameData?.name || "(blank)", email: email || "(blank)", status: "failed", error: "First Name, Last Name, and Email are required" });
        continue;
      }
      if (!phone) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Phone number is required" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Invalid email format" });
        continue;
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Email already registered" });
        continue;
      }
      try {
        const password = generatePassword();
        const passwordHash = await hashPassword(password);
        await prisma.user.create({
          data: {
            name: nameData.name,
            email, passwordHash, role: "MENTOR", phone: phone || null, track: track ?? null,
          },
        });
        try { await sendInstructorWelcomeEmail({ to: email, name: nameData.name, tempPassword: password, loginUrl: `${process.env.APP_URL ?? ""}/instructor-login` }); } catch { /* silent */ }
        results.push({ row: i + 2, name: nameData.name, email, status: "success" });
      } catch (err) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    if (successCount > 0) await notifyAdmins(`Bulk import: ${successCount} instructor(s) created.`, "/admin/manage").catch(() => {});
    return res.json({ total: rows.length, success: successCount, failed: results.filter((r) => r.status === "failed").length, results });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// ─── POST /admin/bulk-import/admins ───────────────────────────────────────────
router.post("/admins", authenticate, authorize("ADMIN"), upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    if (rows.length === 0) return res.status(400).json({ error: "File is empty" });
    if (rows.length > 50) return res.status(400).json({ error: "Maximum 50 rows per import" });

    const results: Array<{ row: number; name: string; email: string; status: "success" | "failed"; error?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nameData = parseName(row);
      const email = (row["Email"] || row["email"] || "").toString().trim().toLowerCase();
      const phone = (row["Phone"] || row["phone"] || "").toString().trim();

      if (!nameData || !email) {
        results.push({ row: i + 2, name: nameData?.name || "(blank)", email: email || "(blank)", status: "failed", error: "First Name, Last Name, and Email are required" });
        continue;
      }
      if (!phone) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Phone number is required" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Invalid email format" });
        continue;
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Email already registered" });
        continue;
      }
      try {
        const password = generatePassword();
        const passwordHash = await hashPassword(password);
        await prisma.user.create({
          data: {
            name: nameData.name,
            email, passwordHash, role: "ADMIN", phone: phone || null,
          },
        });
        results.push({ row: i + 2, name: nameData.name, email, status: "success" });
      } catch (err) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    if (successCount > 0) await notifyAdmins(`Bulk import: ${successCount} admin(s) created.`, "/admin/manage").catch(() => {});
    return res.json({ total: rows.length, success: successCount, failed: results.filter((r) => r.status === "failed").length, results });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// ─── POST /admin/bulk-import/parents ──────────────────────────────────────────
router.post("/parents", authenticate, authorize("ADMIN"), upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    if (rows.length === 0) return res.status(400).json({ error: "File is empty" });
    if (rows.length > 100) return res.status(400).json({ error: "Maximum 100 rows per import" });

    const results: Array<{ row: number; name: string; email: string; status: "success" | "failed"; error?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nameData = parseName(row);
      const email = (row["Email"] || row["email"] || "").toString().trim().toLowerCase();
      const phone = (row["Phone"] || row["phone"] || "").toString().trim();

      if (!nameData || !email) {
        results.push({ row: i + 2, name: nameData?.name || "(blank)", email: email || "(blank)", status: "failed", error: "First Name, Last Name, and Email are required" });
        continue;
      }
      if (!phone) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Phone number is required" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Invalid email format" });
        continue;
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: "Email already registered" });
        continue;
      }
      try {
        const tempPassword = generatePassword();
        const passwordHash = await hashPassword(tempPassword);
        await prisma.user.create({
          data: {
            name: nameData.name,
            email, passwordHash, role: "PARENT", phone: phone || null,
          },
        });
        try { await sendParentWelcomeEmail({ to: email, name: nameData.name, tempPassword }); } catch { /* silent */ }
        results.push({ row: i + 2, name: nameData.name, email, status: "success" });
      } catch (err) {
        results.push({ row: i + 2, name: nameData.name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    if (successCount > 0) await notifyAdmins(`Bulk import: ${successCount} parent(s) created.`, "/admin/parents").catch(() => {});
    return res.json({ total: rows.length, success: successCount, failed: results.filter((r) => r.status === "failed").length, results });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// ─── Manual JSON endpoints ────────────────────────────────────────────────────
interface ManualRow { firstName: string; lastName: string; email: string; phone?: string; track?: string; }
type ManualResult = { row: number; name: string; email: string; status: "success" | "failed"; error?: string };

// POST /admin/bulk-import/students/manual
router.post("/students/manual", authenticate, authorize("ADMIN", "MENTOR"), async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = req.body as { rows: ManualRow[] };
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No rows provided" });
    if (rows.length > 200) return res.status(400).json({ error: "Maximum 200 rows" });
    const results: ManualResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const { firstName, lastName, email: rawEmail, phone, track } = rows[i];
      const name = `${(firstName ?? "").trim()} ${(lastName ?? "").trim()}`.trim();
      const email = (rawEmail ?? "").trim().toLowerCase();
      if (!name || !email || !track) { results.push({ row: i + 1, name: name || "(blank)", email: email || "(blank)", status: "failed", error: "First name, last name, email and track are required" }); continue; }
      if (!phone?.trim()) { results.push({ row: i + 1, name, email, status: "failed", error: "Phone number is required" }); continue; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { results.push({ row: i + 1, name, email, status: "failed", error: "Invalid email format" }); continue; }
      if (await prisma.user.findUnique({ where: { email } })) { results.push({ row: i + 1, name, email, status: "failed", error: "Email already registered" }); continue; }
      try {
        const password = generatePassword();
        const studentCode = await generateStudentCode();
        await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "STUDENT", phone: phone?.trim() || null, student: { create: { id: `s_${Date.now()}_${i}`, studentCode, name, email, track: track.trim(), avatarColor: "#16a34a" } } } });
        sendStudentWelcomeEmail({ to: email, name, track: track.trim(), tempPassword: password }).catch(() => {});
        results.push({ row: i + 1, name, email, status: "success" });
      } catch (err) { results.push({ row: i + 1, name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" }); }
    }
    const successCount = results.filter((r) => r.status === "success").length;
    if (successCount > 0) notifyAdmins(`Manual entry: ${successCount} student(s) created.`, "/admin/manage").catch(() => {});
    return res.json({ total: rows.length, success: successCount, failed: results.filter((r) => r.status === "failed").length, results });
  } catch (err) { return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" }); }
});

// POST /admin/bulk-import/instructors/manual
router.post("/instructors/manual", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = req.body as { rows: ManualRow[] };
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No rows provided" });
    const results: ManualResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const { firstName, lastName, email: rawEmail, phone, track } = rows[i];
      const name = `${(firstName ?? "").trim()} ${(lastName ?? "").trim()}`.trim();
      const email = (rawEmail ?? "").trim().toLowerCase();
      if (!name || !email) { results.push({ row: i + 1, name: name || "(blank)", email: email || "(blank)", status: "failed", error: "First name, last name, and email are required" }); continue; }
      if (!phone?.trim()) { results.push({ row: i + 1, name, email, status: "failed", error: "Phone number is required" }); continue; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { results.push({ row: i + 1, name, email, status: "failed", error: "Invalid email format" }); continue; }
      if (await prisma.user.findUnique({ where: { email } })) { results.push({ row: i + 1, name, email, status: "failed", error: "Email already registered" }); continue; }
      try {
        const password = generatePassword();
        await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "MENTOR", phone: phone?.trim() || null, track: track?.trim() || null } });
        sendInstructorWelcomeEmail({ to: email, name, tempPassword: password }).catch(() => {});
        results.push({ row: i + 1, name, email, status: "success" });
      } catch (err) { results.push({ row: i + 1, name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" }); }
    }
    const successCount = results.filter((r) => r.status === "success").length;
    if (successCount > 0) notifyAdmins(`Manual entry: ${successCount} instructor(s) created.`, "/admin/manage").catch(() => {});
    return res.json({ total: rows.length, success: successCount, failed: results.filter((r) => r.status === "failed").length, results });
  } catch (err) { return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" }); }
});

// POST /admin/bulk-import/admins/manual
router.post("/admins/manual", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = req.body as { rows: ManualRow[] };
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No rows provided" });
    const results: ManualResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const { firstName, lastName, email: rawEmail, phone } = rows[i];
      const name = `${(firstName ?? "").trim()} ${(lastName ?? "").trim()}`.trim();
      const email = (rawEmail ?? "").trim().toLowerCase();
      if (!name || !email) { results.push({ row: i + 1, name: name || "(blank)", email: email || "(blank)", status: "failed", error: "First name, last name, and email are required" }); continue; }
      if (!phone?.trim()) { results.push({ row: i + 1, name, email, status: "failed", error: "Phone number is required" }); continue; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { results.push({ row: i + 1, name, email, status: "failed", error: "Invalid email format" }); continue; }
      if (await prisma.user.findUnique({ where: { email } })) { results.push({ row: i + 1, name, email, status: "failed", error: "Email already registered" }); continue; }
      try {
        const password = generatePassword();
        await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "ADMIN", phone: phone?.trim() || null } });
        results.push({ row: i + 1, name, email, status: "success" });
      } catch (err) { results.push({ row: i + 1, name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" }); }
    }
    const successCount = results.filter((r) => r.status === "success").length;
    if (successCount > 0) notifyAdmins(`Manual entry: ${successCount} admin(s) created.`, "/admin/manage").catch(() => {});
    return res.json({ total: rows.length, success: successCount, failed: results.filter((r) => r.status === "failed").length, results });
  } catch (err) { return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" }); }
});

// POST /admin/bulk-import/parents/manual
router.post("/parents/manual", authenticate, authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = req.body as { rows: ManualRow[] };
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "No rows provided" });
    const results: ManualResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const { firstName, lastName, email: rawEmail, phone } = rows[i];
      const name = `${(firstName ?? "").trim()} ${(lastName ?? "").trim()}`.trim();
      const email = (rawEmail ?? "").trim().toLowerCase();
      if (!name || !email) { results.push({ row: i + 1, name: name || "(blank)", email: email || "(blank)", status: "failed", error: "First name, last name, and email are required" }); continue; }
      if (!phone?.trim()) { results.push({ row: i + 1, name, email, status: "failed", error: "Phone number is required" }); continue; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { results.push({ row: i + 1, name, email, status: "failed", error: "Invalid email format" }); continue; }
      if (await prisma.user.findUnique({ where: { email } })) { results.push({ row: i + 1, name, email, status: "failed", error: "Email already registered" }); continue; }
      try {
        const password = generatePassword();
        await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "PARENT", phone: phone?.trim() || null } });
        sendParentWelcomeEmail({ to: email, name, tempPassword: password }).catch(() => {});
        results.push({ row: i + 1, name, email, status: "success" });
      } catch (err) { results.push({ row: i + 1, name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" }); }
    }
    const successCount = results.filter((r) => r.status === "success").length;
    if (successCount > 0) notifyAdmins(`Manual entry: ${successCount} parent(s) created.`, "/admin/parents").catch(() => {});
    return res.json({ total: rows.length, success: successCount, failed: results.filter((r) => r.status === "failed").length, results });
  } catch (err) { return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" }); }
});

export default router;