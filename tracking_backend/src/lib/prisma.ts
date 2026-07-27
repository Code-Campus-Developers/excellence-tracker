import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

export async function generateStudentCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.student.count();
  return `CC-${year}-${String(count + 1).padStart(3, "0")}`;
}
