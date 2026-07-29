-- CreateTable
CREATE TABLE "track_assignments" (
    "id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "track_assignments_track_start_date_idx" ON "track_assignments"("track", "start_date");

-- AddForeignKey
ALTER TABLE "track_assignments" ADD CONSTRAINT "track_assignments_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
