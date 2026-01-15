-- AlterTable
ALTER TABLE "ChallengeSubmission" ADD COLUMN     "hideExactValue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;
