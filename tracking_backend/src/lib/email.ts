import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.APP_URL ?? "http://localhost:8080";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:8080";

// ─── Helper: send silently (never throws) ─────────────────────────────────────
export async function sendSilent(fn: () => Promise<void>) {
  try { await fn(); } catch (e) { console.error("Email send failed:", e); }
}

export async function sendAdminNewStudentEmail(opts: { studentName: string; studentEmail: string; track: string }) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New Student Registration: ${opts.studentName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">New Student Registration</h2>
        <p>A student has self-registered on the Code Campus platform.</p>
        <table style="border-collapse:collapse;width:100%;margin-top:12px">
          <tr><td style="padding:8px;font-weight:bold;color:#374151">Name</td><td style="padding:8px">${opts.studentName}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold;color:#374151">Email</td><td style="padding:8px">${opts.studentEmail}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#374151">Track</td><td style="padding:8px">${opts.track}</td></tr>
        </table>
        <a href="${FRONTEND_URL}/admin/manage" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:16px">Manage Students</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus Excellence Tracker</p>
      </div>
    `,
  });
}

export async function sendAdminNewParentEmail(opts: { parentName: string; parentEmail: string }) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New Parent Registration: ${opts.parentName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1d4ed8">New Parent Registration</h2>
        <p>A parent has self-registered on the Code Campus platform and needs their child linked.</p>
        <table style="border-collapse:collapse;width:100%;margin-top:12px">
          <tr><td style="padding:8px;font-weight:bold;color:#374151">Name</td><td style="padding:8px">${opts.parentName}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold;color:#374151">Email</td><td style="padding:8px">${opts.parentEmail}</td></tr>
        </table>
        <a href="${FRONTEND_URL}/admin/parents" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:16px">Manage Parents</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus Excellence Tracker</p>
      </div>
    `,
  });
}

export async function sendParentSelfRegisterEmail(opts: { to: string; name: string }) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Welcome to the Code Campus Parent Portal",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Welcome, ${opts.name}!</h2>
        <p>Your Code Campus Parent Portal account has been created successfully.</p>
        <p>You can now log in and monitor your child's progress, attendance, and weekly reports.</p>
        <p style="color:#d97706;font-size:13px">⚠️ Your child's profile has not been linked yet. Please contact the Code Campus admin team to have your child linked to your account.</p>
        <a href="${FRONTEND_URL}/parent-login" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Access Parent Portal</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendEditRequestEmailToInstructor(opts: {
  to: string;
  instructorName: string;
  studentName: string;
  week: number;
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Edit Request: ${opts.studentName} — Week ${opts.week} Self-Report`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#d97706">Edit Request ✏️</h2>
        <p>Hi <strong>${opts.instructorName}</strong>,</p>
        <p><strong>${opts.studentName}</strong> has requested permission to edit their <strong>Week ${opts.week}</strong> self-report.</p>
        <p>Please review and approve or deny the request in the portal.</p>
        <a href="${FRONTEND_URL}/instructor/reports" style="display:inline-block;background:#d97706;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Review Request</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendDailyEventParentEmail(opts: {
  to: string;
  parentName: string;
  studentName: string;
  date: string;
  description?: string | null;
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.studentName} submitted a daily activity — ${opts.date}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Daily Activity Submitted 📋</h2>
        <p>Hi <strong>${opts.parentName}</strong>,</p>
        <p><strong>${opts.studentName}</strong> submitted their daily activity report for <strong>${opts.date}</strong>.</p>
        ${opts.description ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:12px 0;font-size:14px">${opts.description}</div>` : ""}
        <a href="${FRONTEND_URL}/parent-login" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View in Parent Portal</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendMissedAttendanceEmail(opts: {
  to: string;
  parentName: string;
  studentName: string;
  date: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `⚠️ ${opts.studentName} did not clock in today — ${opts.date}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#dc2626">Attendance Alert ⚠️</h2>
        <p>Hi <strong>${opts.parentName}</strong>,</p>
        <p>Our records show that <strong>${opts.studentName}</strong> did not clock in at Code Campus today (<strong>${opts.date}</strong>).</p>
        <p>If this was unplanned, please follow up with your child or contact the instructor.</p>
        <p style="color:#6b7280;font-size:13px">📌 If your child is not scheduled to attend today, you can disregard this message.</p>
        <a href="${FRONTEND_URL}/parent-login" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View Attendance</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendParentWelcomeEmail(opts: {
  to: string;
  name: string;
  tempPassword: string;
}) {
  const url = `${FRONTEND_URL}/parent-login`;
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Code Campus Parent Portal — Your Account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Welcome to the Parent Portal, ${opts.name}!</h2>
        <p>An account has been created for you on the <strong>Code Campus Excellence Tracker</strong> so you can monitor your child's progress.</p>
        <p><strong>Email:</strong> ${opts.to}<br/>
           <strong>Temporary Password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${opts.tempPassword}</code></p>
        <p>Please log in and change your password immediately.</p>
        <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Access Parent Portal</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendChildLinkedEmail(opts: {
  to: string;
  parentName: string;
  studentName: string;
  track: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.studentName} has been linked to your Parent Portal account`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Child Linked to Your Account</h2>
        <p>Hi <strong>${opts.parentName}</strong>,</p>
        <p><strong>${opts.studentName}</strong> (${opts.track}) has been linked to your Code Campus Parent Portal account by the admin team.</p>
        <p>You can now view their weekly evaluation scores, attendance records, self-reports, and download their QR code directly from your dashboard.</p>
        <a href="${FRONTEND_URL}/parent-login" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View Parent Portal</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendInstructorWelcomeEmail(opts: {  to: string;
  name: string;
  tempPassword: string;
  loginUrl?: string;
}) {
  const url = opts.loginUrl ?? `${FRONTEND_URL}/instructor-login`;
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
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${opts.token}`;
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
  const dashboardUrl = `${FRONTEND_URL}/dashboard`;
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
        <p>Log in to view your full breakdown, charts, instructor feedback, and how you compare to the class.</p>
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
  tempPassword?: string;
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
        ${opts.tempPassword ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px;font-weight:bold">Your login credentials:</p>
          <p style="margin:0"><strong>Email:</strong> ${opts.to}</p>
          <p style="margin:4px 0 0"><strong>Password:</strong> <span style="font-family:monospace;background:#e5e7eb;padding:2px 6px;border-radius:4px">${opts.tempPassword}</span></p>
        </div>
        <p style="color:#dc2626;font-size:13px">⚠️ Please change your password after your first login.</p>
        ` : ""}
        <p>You can now log in to view your weekly evaluation scores, track your progress, and see how you compare with your peers.</p>
        <a href="${FRONTEND_URL}/login" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Go to My Dashboard</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Questions? Contact your instructor.</p>
        <p style="color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendSelfReportVerifiedEmail(opts: {
  to: string; name: string; week: number; status: "VERIFIED" | "REJECTED";
}) {
  const isVerified = opts.status === "VERIFIED";
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your Week ${opts.week} Self-Report ${isVerified ? "Verified" : "Rejected"} — Code Campus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:${isVerified ? "#16a34a" : "#dc2626"}">${isVerified ? "Self-Report Verified ✅" : "Self-Report Rejected ❌"}</h2>
        <p>Hi <strong>${opts.name}</strong>,</p>
        <p>Your <strong>Week ${opts.week}</strong> self-report has been <strong>${isVerified ? "verified" : "rejected"}</strong> by your instructor.</p>
        ${!isVerified ? "<p>Please log in, review your submission, and resubmit with the correct proof links.</p>" : "<p>Great work keeping up with your activities this week!</p>"}
        <a href="${FRONTEND_URL}/student/self-report" style="display:inline-block;background:${isVerified ? "#16a34a" : "#dc2626"};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View Self-Reports</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendTrackInstructorAssignedEmail(opts: {
  to: string; studentName: string; instructorName: string; track: string; startDate: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your ${opts.track} Instructor Update — Code Campus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Instructor Update 👨‍🏫</h2>
        <p>Hi <strong>${opts.studentName}</strong>,</p>
        <p>Your instructor for the <strong>${opts.track}</strong> track has been updated.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <div style="font-size:16px;font-weight:bold;color:#16a34a">${opts.instructorName}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:4px">${opts.track} Track · From ${opts.startDate}</div>
        </div>
        <p>You can message your instructor directly from your dashboard.</p>
        <a href="${FRONTEND_URL}/student/messages" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Message Instructor</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendEditRequestEmail(opts: {
  to: string; recipientName: string; studentName: string; week: number;
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Edit Request: ${opts.studentName} - Week ${opts.week} Self-Report — Code Campus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#f59e0b">Edit Request 📝</h2>
        <p>Hi <strong>${opts.recipientName}</strong>,</p>
        <p><strong>${opts.studentName}</strong> has requested to edit their <strong>Week ${opts.week}</strong> self-report (which was previously verified).</p>
        <p>Please log in to review and approve or deny this request.</p>
        <a href="${FRONTEND_URL}/instructor/reports" style="display:inline-block;background:#f59e0b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Review Request</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendEditApprovalEmail(opts: {
  to: string; studentName: string; week: number; approved: boolean;
}) {
  const color = opts.approved ? "#16a34a" : "#dc2626";
  const title = opts.approved ? "Edit Request Approved ✅" : "Edit Request Denied ❌";
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your Week ${opts.week} Edit Request ${opts.approved ? "Approved" : "Denied"} — Code Campus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:${color}">${title}</h2>
        <p>Hi <strong>${opts.studentName}</strong>,</p>
        ${opts.approved
          ? `<p>Your request to edit your <strong>Week ${opts.week}</strong> self-report has been <strong>approved</strong>. You can now log in and make your changes.</p>`
          : `<p>Your request to edit your <strong>Week ${opts.week}</strong> self-report has been <strong>denied</strong> by your instructor.</p>`}
        <a href="${FRONTEND_URL}/student/self-report" style="display:inline-block;background:${color};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Go to Self-Reports</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

// ─── Parent Notification Emails ───────────────────────────────────────────────

export async function sendParentEvaluationEmail(opts: {
  to: string;
  parentName: string;
  studentName: string;
  week: number;
  total: number;
  evaluator: string;
}) {
  const color = opts.total >= 80 ? "#16a34a" : opts.total >= 60 ? "#d97706" : "#dc2626";
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.studentName}'s Week ${opts.week} Evaluation — Code Campus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#16a34a">Evaluation Result</h2>
        <p>Hi <strong>${opts.parentName}</strong>,</p>
        <p><strong>${opts.studentName}</strong>'s Week ${opts.week} evaluation has been submitted by <strong>${opts.evaluator}</strong>.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
          <div style="font-size:48px;font-weight:bold;color:${color}">${opts.total}<span style="font-size:20px;color:#6b7280">/100</span></div>
          <div style="color:#6b7280;font-size:14px;margin-top:4px">Week ${opts.week} Score</div>
        </div>
        <a href="${FRONTEND_URL}/parent-login" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View in Parent Portal</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendParentReportStatusEmail(opts: {
  to: string;
  parentName: string;
  studentName: string;
  week: number;
  status: "VERIFIED" | "REJECTED";
}) {
  const isVerified = opts.status === "VERIFIED";
  const color = isVerified ? "#16a34a" : "#dc2626";
  const label = isVerified ? "Verified ✅" : "Rejected ❌";
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.studentName}'s Week ${opts.week} Report ${label} — Code Campus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:${color}">Self-Report ${label}</h2>
        <p>Hi <strong>${opts.parentName}</strong>,</p>
        <p><strong>${opts.studentName}</strong>'s Week ${opts.week} self-report has been <strong>${isVerified ? "verified" : "rejected"}</strong> by their instructor.</p>
        ${!isVerified ? `<p style="color:#dc2626">They may need to resubmit or request an edit.</p>` : ""}
        <a href="${FRONTEND_URL}/parent-login" style="display:inline-block;background:${color};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View in Parent Portal</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}

export async function sendParentAttendanceEmail(opts: {
  to: string;
  parentName: string;
  studentName: string;
  action: "clock_in" | "clock_out";
  time: string;
  durationMin?: number | null;
}) {
  const isIn = opts.action === "clock_in";
  const color = isIn ? "#16a34a" : "#2563eb";
  const durText = opts.durationMin
    ? `Time at campus: <strong>${Math.floor(opts.durationMin / 60)}h ${opts.durationMin % 60}m</strong>`
    : "";
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.studentName} ${isIn ? "arrived at" : "left"} Code Campus — ${opts.time}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:${color}">${isIn ? "Clocked In 🟢" : "Clocked Out 🔴"}</h2>
        <p>Hi <strong>${opts.parentName}</strong>,</p>
        <p><strong>${opts.studentName}</strong> has <strong>${isIn ? "clocked in at" : "clocked out at"}</strong> <strong>${opts.time}</strong> today.</p>
        ${durText ? `<p>${durText}</p>` : ""}
        <a href="${FRONTEND_URL}/parent-login" style="display:inline-block;background:${color};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View in Parent Portal</a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">Code Campus International</p>
      </div>
    `,
  });
}
