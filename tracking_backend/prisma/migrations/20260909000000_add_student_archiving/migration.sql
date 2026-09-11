ALTER TABLE "students"
ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archived_at" TIMESTAMP(3),
ADD COLUMN "archive_reason" TEXT;

CREATE INDEX "students_is_archived_idx" ON "students"("is_archived");
