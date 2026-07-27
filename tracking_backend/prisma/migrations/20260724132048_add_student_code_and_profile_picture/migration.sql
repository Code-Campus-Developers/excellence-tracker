/*
  Warnings:

  - A unique constraint covering the columns `[student_code]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `student_code` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add student_code as nullable first, backfill, then make unique
ALTER TABLE "students" ADD COLUMN "student_code" TEXT;

-- Backfill existing students with generated codes CC-YEAR-NNN
DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
  yr TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
BEGIN
  FOR rec IN SELECT id FROM students ORDER BY created_at ASC LOOP
    UPDATE students
      SET student_code = 'CC-' || yr || '-' || LPAD(counter::TEXT, 3, '0')
      WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE "students" ALTER COLUMN "student_code" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "profile_picture" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "students_student_code_key" ON "students"("student_code");
