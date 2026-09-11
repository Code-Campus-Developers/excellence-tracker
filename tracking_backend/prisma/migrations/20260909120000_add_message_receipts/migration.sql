ALTER TABLE "messages"
ADD COLUMN "delivered_at" TIMESTAMP(3),
ADD COLUMN "read_at" TIMESTAMP(3);

UPDATE "messages"
SET "read_at" = "created_at", "delivered_at" = "created_at"
WHERE "is_read" = true;
