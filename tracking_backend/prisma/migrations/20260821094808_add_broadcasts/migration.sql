-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
