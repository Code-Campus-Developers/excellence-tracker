-- AlterTable
ALTER TABLE "broadcasts" ADD COLUMN     "target_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
