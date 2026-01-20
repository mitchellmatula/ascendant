-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ClassBenchmark" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "targetTier" TEXT;

-- AlterTable
ALTER TABLE "ClassCoach" ADD COLUMN     "isHeadCoach" BOOLEAN NOT NULL DEFAULT false;
