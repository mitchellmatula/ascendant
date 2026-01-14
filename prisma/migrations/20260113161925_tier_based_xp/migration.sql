/*
  Warnings:

  - You are about to drop the column `baseXP` on the `Challenge` table. All the data in the column will be lost.
  - You are about to drop the column `xpPerTier` on the `Challenge` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `ChallengeSubmission` table. All the data in the column will be lost.
  - Made the column `xpAwarded` on table `ChallengeSubmission` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Challenge" DROP COLUMN "baseXP",
DROP COLUMN "xpPerTier";

-- AlterTable
ALTER TABLE "ChallengeSubmission" DROP COLUMN "version",
ADD COLUMN     "achievedRank" TEXT,
ADD COLUMN     "achievedValue" INTEGER,
ADD COLUMN     "claimedTiers" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "xpAwarded" SET NOT NULL,
ALTER COLUMN "xpAwarded" SET DEFAULT 0;
