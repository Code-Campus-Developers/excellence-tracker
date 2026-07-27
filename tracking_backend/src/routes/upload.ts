import { Router, type Response } from "express";
import multer from "multer";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import cloudinary from "../lib/cloudinary";

const router = Router();

// ─── Multer: memory storage, image files only, max 5 MB ──────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB — Cloudinary compresses to ~20-80 KB after upload
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WEBP, GIF) are allowed"));
    }
  },
});

// ─── POST /api/upload/profile-picture ────────────────────────────────────────
// Accepts multipart/form-data with field "file"
// Returns { url: string }
router.post(
  "/profile-picture",
  authenticate,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Upload buffer to Cloudinary with signed credentials
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "excellence-tracker/profiles",
            public_id: `user_${req.user!.userId}`,
            overwrite: true,
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload failed"));
            else resolve(result as { secure_url: string });
          }
        );
        stream.end(req.file!.buffer);
      });

      return res.json({ url: result.secure_url });
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }
);

// ─── GET /api/upload/proxy-image?url=...
// Fetches an external image and returns it as base64 data URL (bypasses browser CORS cache)
router.get("/proxy-image", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.query as { url?: string };
    if (!url || !url.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid URL" });
    }
    const response = await fetch(url);
    if (!response.ok) return res.status(502).json({ error: "Failed to fetch image" });
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    return res.json({ dataUrl: `data:${contentType};base64,${base64}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error" });
  }
});

export default router;
