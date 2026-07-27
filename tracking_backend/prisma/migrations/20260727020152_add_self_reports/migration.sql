-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "self_reports" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "cohort_year" INTEGER NOT NULL,
    "linkedin_done" BOOLEAN NOT NULL DEFAULT false,
    "linkedin_url" TEXT,
    "learning_log_done" BOOLEAN NOT NULL DEFAULT false,
    "learning_log_url" TEXT,
    "coding_done" BOOLEAN NOT NULL DEFAULT false,
    "coding_url" TEXT,
    "event_done" BOOLEAN NOT NULL DEFAULT false,
    "event_url" TEXT,
    "notes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "self_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "self_reports_student_id_week_number_cohort_year_key" ON "self_reports"("student_id", "week_number", "cohort_year");

-- AddForeignKey
ALTER TABLE "self_reports" ADD CONSTRAINT "self_reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
