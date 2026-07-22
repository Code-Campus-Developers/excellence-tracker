import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.APP_URL ?? "http://localhost:8080";

export async function sendMentorWelcomeEmail(opts: {
  to: string;
  name: string;
  tempPassword: string;
  loginUrl?: string;
}) {
  const url = opts.loginUrl ?? `${APP_URL}/mentor-login`;
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Welcome to Code Campus Excellence Tracker — Your Account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Welcome, ${opts.name}!</h2>
        <p>Your account has been created on the <strong>Code Campus Excellence Tracker</strong>.</p>
        <p><strong>Email:</strong> ${opts.to}<br/>
           <strong>Temporary Password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${opts.tempPassword}</code></p>
        <p>Please log in and change your password immediately.</p>
        <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Log In</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  token: string;
}) {
  const resetUrl = `${APP_URL}/reset-password?token=${opts.token}`;
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Reset Your Password — Code Campus Excellence Tracker",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Password Reset</h2>
        <p>Hi ${opts.name}, we received a request to reset your password.</p>
        <p>Click the button below — this link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Reset Password</a>
        <p style="margin-top:16px;color:#6b7280;font-size:13px">If you didn't request this, ignore this email.</p>
        <p style="color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendEvaluationEmail(opts: {
  to: string;
  name: string;
  week: number;
  total: number;
  evaluator: string;
}) {
  const dashboardUrl = `${APP_URL}/dashboard`;
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your Week ${opts.week} Evaluation is Ready — Code Campus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Hi ${opts.name}, your results are in! 🎉</h2>
        <p>Your <strong>Week ${opts.week}</strong> evaluation has been submitted by <strong>${opts.evaluator}</strong>.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
          <div style="font-size:48px;font-weight:bold;color:#16a34a">${opts.total}<span style="font-size:20px;color:#6b7280">/100</span></div>
          <div style="color:#6b7280;font-size:14px;margin-top:4px">Week ${opts.week} Score</div>
        </div>
        <p>Log in to view your full breakdown, charts, mentor feedback, and how you compare to the class.</p>
        <a href="${dashboardUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View My Dashboard</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendStudentWelcomeEmail(opts: {
  to: string;
  name: string;
  track: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Welcome to Code Campus Excellence Tracker! 🎉",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Welcome, ${opts.name}!</h2>
        <p>Your student account has been created on the <strong>Code Campus Excellence Tracker</strong>.</p>
        <p><strong>Track:</strong> ${opts.track}</p>
        <p>You can now log in to view your weekly evaluation scores, track your progress, and see how you compare with your peers.</p>
        <a href="${APP_URL}/login" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Go to My Dashboard</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Questions? Contact your mentor.</p>
        <p style="color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}
