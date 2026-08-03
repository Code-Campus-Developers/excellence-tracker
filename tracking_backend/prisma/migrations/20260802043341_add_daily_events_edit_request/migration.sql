-- AlterTable
ALTER TABLE "self_reports" ADD COLUMN     "edit_requested" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "daily_events" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "image_1" TEXT,
    "image_2" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_events_date_idx" ON "daily_events"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_events_student_id_date_key" ON "daily_events"("student_id", "date");

-- AddForeignKey
ALTER TABLE "daily_events" ADD CONSTRAINT "daily_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
