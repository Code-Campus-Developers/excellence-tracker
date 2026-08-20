import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

export async function generateStudentCode(): Promise<string> {
  // Find the highest existing CC-Student-NNN number to avoid collisions
  const students = await prisma.student.findMany({ select: { studentCode: true } });
  let max = 0;
  for (const s of students) {
    const match = s.studentCode.match(/CC-Student-(\d+)/i);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `CC-Student-${String(max + 1).padStart(3, "0")}`;
}
