import { Router, type Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import prisma, { generateStudentCode } from "../lib/prisma";
import { hashPassword, generateResetToken } from "../lib/auth";
import { authenticate, authorize, type AuthRequest } from "../middleware/authenticate";
import { sendStudentWelcomeEmail } from "../lib/email";
import { notifyAdmins } from "./notifications";

const router = Router();

// ─── Helper: generate a strong random password ───────────────────────────────
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$!%&*";
  const all = upper + lower + digits + symbols;
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)];
  // Ensure at least one of each required char
  const pw = [rand(upper), rand(lower), rand(digits), rand(symbols)];
  for (let i = 4; i < 10; i++) pw.push(rand(all));
  // Shuffle
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join("");
}

// ─── Multer: memory storage, accept csv/excel ─────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/csv",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xls|xlsx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV, XLS, or XLSX files are allowed"));
    }
  },
});

// ─── POST /admin/bulk-import/students ─────────────────────────────────────────
router.post(
  "/students",
  authenticate,
  authorize("ADMIN", "MENTOR"),
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // Parse file with xlsx (handles csv, xls, xlsx)
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

      if (rows.length === 0) return res.status(400).json({ error: "File is empty or has no data rows" });
      if (rows.length > 200) return res.status(400).json({ error: "Maximum 200 rows per import" });

      const results: Array<{ row: number; name: string; email: string; status: "success" | "failed"; error?: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Flexible header matching (case-insensitive)
        const name = (row["Name"] || row["name"] || row["Full Name"] || row["fullname"] || "").toString().trim();
        const email = (row["Email"] || row["email"] || row["Email Address"] || "").toString().trim().toLowerCase();
        const track = (row["Track"] || row["track"] || row["Programme"] || "").toString().trim();
        const phone = (row["Phone"] || row["phone"] || row["Phone Number"] || "").toString().trim();

        if (!name || !email || !track) {
          results.push({ row: i + 2, name: name || "(blank)", email: email || "(blank)", status: "failed", error: "Name, Email, and Track are required" });
          continue;
        }

        // Check email valid format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.push({ row: i + 2, name, email, status: "failed", error: "Invalid email format" });
          continue;
        }

        // Check duplicate email in DB
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          results.push({ row: i + 2, name, email, status: "failed", error: "Email already registered" });
          continue;
        }

        try {
          const password = generatePassword();
          const passwordHash = await hashPassword(password);
          const studentId = `s_${Date.now()}_${i}`;
          const studentCode = await generateStudentCode();

          await prisma.user.create({
            data: {
              name, email, passwordHash, role: "STUDENT",
              phone: phone || null,
              student: { create: { id: studentId, studentCode, name, email, track, avatarColor: "#16a34a" } },
            },
          });

          // Send welcome email with generated password
          try {
            await sendStudentWelcomeEmail({ to: email, name, track, tempPassword: password });
          } catch { /* email failure shouldn't block import */ }

          results.push({ row: i + 2, name, email, status: "success" });
        } catch (err) {
          results.push({ row: i + 2, name, email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;
      const failCount = results.filter((r) => r.status === "failed").length;

      // Notify admins
      if (successCount > 0) {
        await notifyAdmins(`Bulk import: ${successCount} student(s) created successfully.`, "/admin/manage").catch(() => {});
      }

      return res.json({ total: rows.length, success: successCount, failed: failCount, results });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
    }
  }
);

export default router;
