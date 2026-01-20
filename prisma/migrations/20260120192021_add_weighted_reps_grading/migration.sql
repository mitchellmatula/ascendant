-- AlterEnum
ALTER TYPE "GradingType" ADD VALUE 'WEIGHTED_REPS';

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "weightUnit" TEXT;

-- AlterTable
ALTER TABLE "ChallengeGrade" ADD COLUMN     "targetWeight" INTEGER;

-- AlterTable
ALTER TABLE "ChallengeSubmission" ADD COLUMN     "achievedWeight" INTEGER;
