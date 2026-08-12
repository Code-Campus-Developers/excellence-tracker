import { Router, Request, Response } from "express";
import prisma, { generateStudentCode } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { sendParentSelfRegisterEmail, sendAdminNewParentEmail, sendAdminNewStudentEmail } from "../lib/email";
import { notifyAdmins } from "./notifications";

const router = Router();

const FRONTEND_URL  = process.env.FRONTEND_URL ?? "http://localhost:8080";
const BACKEND_URL   = process.env.APP_URL ?? "http://localhost:4000";
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const CALLBACK_URL  = `${BACKEND_URL}/auth/google/callback`;

// GET /auth/google  — optional ?role=PARENT|STUDENT (default STUDENT)
router.get("/", (req: Request, res: Response) => {
  const role = (req.query as { role?: string }).role ?? "STUDENT";
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    state: role,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/google/callback
router.get("/callback", async (req: Request, res: Response) => {
  const { code, error, state } = req.query as { code?: string; error?: string; state?: string };
  const intendedRole = state === "PARENT" ? "PARENT" : "STUDENT";
  const errorRedirect = intendedRole === "PARENT"
    ? `${FRONTEND_URL}/parent-login?error=google_failed`
    : `${FRONTEND_URL}/login?error=google_failed`;

  if (error || !code) {
    console.error("Google returned error:", error);
    return res.redirect(errorRedirect);
  }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: CALLBACK_URL, grant_type: "authorization_code" }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      console.error("Token exchange failed:", JSON.stringify(tokenData));
      return res.redirect(errorRedirect);
    }
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as { id: string; email: string; name: string; picture?: string };
    if (!profile.email) {
      console.error("No email from Google profile");
      return res.redirect(errorRedirect);
    }
    console.log(`Google OAuth: ${profile.email}`);
    let isNewUser = false;
    let user = await prisma.user.findFirst({ where: { OR: [{ googleId: profile.id }, { email: profile.email }] }, include: { student: true } });
    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.id }, include: { student: true } });
      }
    } else {
      isNewUser = true;
      if (intendedRole === "PARENT") {
        user = await prisma.user.create({
          data: {
            name: profile.name, email: profile.email, googleId: profile.id,
            passwordHash: null, role: "PARENT", profilePicture: profile.picture ?? null,
          },
          include: { student: true },
        });
        try { await sendParentSelfRegisterEmail({ to: profile.email, name: profile.name }); } catch { /* silent */ }
        try {
          await notifyAdmins(`New parent registered via Google: ${profile.name} (${profile.email})`, "/admin/parents");
          await sendAdminNewParentEmail({ parentName: profile.name, parentEmail: profile.email });
        } catch { /* silent */ }
      } else {
        const studentCode = await generateStudentCode();
        user = await prisma.user.create({
          data: {
            name: profile.name, email: profile.email, googleId: profile.id,
            passwordHash: null, role: "STUDENT", profilePicture: profile.picture ?? null,
            student: { create: { id: `s_${Date.now()}`, studentCode, name: profile.name, email: profile.email, track: "Software Engineering", avatarColor: "#16a34a" } },
          },
          include: { student: true },
        });
        try {
          await notifyAdmins(`New student registered via Google: ${profile.name} (${profile.email})`, "/admin/manage");
          await sendAdminNewStudentEmail({ studentName: profile.name, studentEmail: profile.email, track: "Software Engineering" });
        } catch { /* silent */ }
      }
    }
    const token = signToken({ userId: user.id, role: user.role });
    const params = new URLSearchParams({ token, userId: user.id, name: user.name, email: user.email, role: user.role, track: user.track ?? "", profilePicture: user.profilePicture ?? "", isNewUser: String(isNewUser) });
    if (user.student) {
      params.set("studentId", user.student.id);
      params.set("studentCode", user.student.studentCode);
      params.set("studentTrack", user.student.track);
      params.set("studentAvatarColor", user.student.avatarColor);
    }
    console.log(`Google OAuth success for ${user.email} (${user.role})`);
    return res.redirect(`${FRONTEND_URL}/google-callback?${params.toString()}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return res.redirect(errorRedirect);
  }
});

export default router;
