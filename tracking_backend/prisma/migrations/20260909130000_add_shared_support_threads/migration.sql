ALTER TABLE "messages" ADD COLUMN "support_student_id" TEXT;

UPDATE "messages" AS message
SET "support_student_id" = CASE
  WHEN sender."role" = 'STUDENT' THEN message."sender_id"
  WHEN receiver."role" = 'STUDENT' THEN message."receiver_id"
  ELSE NULL
END
FROM "users" AS sender, "users" AS receiver
WHERE sender."id" = message."sender_id"
  AND receiver."id" = message."receiver_id";

CREATE TABLE "message_reads" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);

INSERT INTO "message_reads" ("id", "message_id", "user_id", "read_at")
SELECT 'legacy_' || md5(message."id" || message."receiver_id"), message."id", message."receiver_id", COALESCE(message."read_at", message."created_at")
FROM "messages" AS message
WHERE message."is_read" = true
ON CONFLICT DO NOTHING;

CREATE INDEX "messages_support_student_id_created_at_idx" ON "messages"("support_student_id", "created_at");
CREATE UNIQUE INDEX "message_reads_message_id_user_id_key" ON "message_reads"("message_id", "user_id");
CREATE INDEX "message_reads_user_id_read_at_idx" ON "message_reads"("user_id", "read_at");

ALTER TABLE "messages" ADD CONSTRAINT "messages_support_student_id_fkey"
FOREIGN KEY ("support_student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
