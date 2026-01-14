-- CreateEnum
CREATE TYPE "GradingType" AS ENUM ('PASS_FAIL', 'REPS', 'TIME', 'DISTANCE', 'TIMED_REPS');

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "gradingType" "GradingType" NOT NULL DEFAULT 'PASS_FAIL',
ADD COLUMN     "gradingUnit" TEXT,
ADD COLUMN     "maxRank" TEXT NOT NULL DEFAULT 'S',
ADD COLUMN     "minRank" TEXT NOT NULL DEFAULT 'F';

-- CreateTable
CREATE TABLE "ChallengeGrade" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "description" TEXT,
    "bonusXP" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeGrade_challengeId_divisionId_rank_key" ON "ChallengeGrade"("challengeId", "divisionId", "rank");

-- AddForeignKey
ALTER TABLE "ChallengeGrade" ADD CONSTRAINT "ChallengeGrade_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeGrade" ADD CONSTRAINT "ChallengeGrade_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;
