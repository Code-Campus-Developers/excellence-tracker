import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

export async function generateStudentCode(): Promise<string> {
  const count = await prisma.student.count();
  return `CC-Student-${String(count + 1).padStart(3, "0")}`;
}
