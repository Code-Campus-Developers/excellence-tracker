import cron from "node-cron";
import prisma from "../lib/prisma";
import { sendMissedAttendanceEmail } from "./email";

/**
 * Runs every day at 6:00 PM (18:00) server time.
 * Finds all active students who have NOT clocked in today,
 * then emails their linked parents.
 */
export function startMissedAttendanceCron() {
  cron.schedule("0 18 * * 1-6", async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

      const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

      // Get all students who clocked in today
      const presentStudentIds = (
        await prisma.attendance.findMany({
          where: { date: { gte: startOfDay, lt: endOfDay } },
          select: { studentId: true },
        })
      ).map((a) => a.studentId);

      // Get all active students who are NOT in that list
      const absentStudents = await prisma.student.findMany({
        where: {
          id: { notIn: presentStudentIds },
          user: { isActive: true },
        },
        select: {
          id: true,
          name: true,
          parentLinks: {
            include: { parent: { select: { name: true, email: true } } },
          },
        },
      });

      for (const student of absentStudents) {
        for (const link of student.parentLinks) {
          await sendMissedAttendanceEmail({
            to: link.parent.email,
            parentName: link.parent.name,
            studentName: student.name,
            date: dateStr,
          }).catch((e) => console.error(`Missed attendance email failed for ${link.parent.email}:`, e));
        }
      }

      if (absentStudents.length > 0) {
        console.log(`[Cron] Missed attendance: notified parents of ${absentStudents.length} absent student(s) for ${dateStr}`);
      }
    } catch (err) {
      console.error("[Cron] Missed attendance check failed:", err);
    }
  }, { timezone: "Africa/Lagos" }); // Nigerian time (WAT = UTC+1)

  console.log("⏰ Missed attendance cron scheduled (6 PM WAT, Mon–Sat)");
}
