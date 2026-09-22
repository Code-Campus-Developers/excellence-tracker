-- An empty list preserves the existing course-wide assignment behaviour.
ALTER TABLE "track_assignments" ADD COLUMN "student_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
