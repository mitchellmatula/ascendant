/*
  Warnings:

  - A unique constraint covering the columns `[stravaAthleteId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[garminUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProofType" AS ENUM ('VIDEO', 'IMAGE', 'STRAVA', 'GARMIN', 'RACE_RESULT', 'MANUAL');

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "activityType" TEXT,
ADD COLUMN     "maxDistance" DOUBLE PRECISION,
ADD COLUMN     "minDistance" DOUBLE PRECISION,
ADD COLUMN     "minElevationGain" DOUBLE PRECISION,
ADD COLUMN     "proofTypes" TEXT[] DEFAULT ARRAY['VIDEO']::TEXT[],
ADD COLUMN     "requiresGPS" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresHeartRate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ChallengeSubmission" ADD COLUMN     "activityAvgHR" INTEGER,
ADD COLUMN     "activityDate" TIMESTAMP(3),
ADD COLUMN     "activityDistance" DOUBLE PRECISION,
ADD COLUMN     "activityElevation" DOUBLE PRECISION,
ADD COLUMN     "activityMaxHR" INTEGER,
ADD COLUMN     "activityTime" INTEGER,
ADD COLUMN     "activityType" TEXT,
ADD COLUMN     "garminActivityId" TEXT,
ADD COLUMN     "garminActivityUrl" TEXT,
ADD COLUMN     "proofType" "ProofType" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN     "stravaActivityId" TEXT,
ADD COLUMN     "stravaActivityUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "garminAccessToken" TEXT,
ADD COLUMN     "garminConnectedAt" TIMESTAMP(3),
ADD COLUMN     "garminRefreshToken" TEXT,
ADD COLUMN     "garminUserId" TEXT,
ADD COLUMN     "stravaAccessToken" TEXT,
ADD COLUMN     "stravaAthleteId" TEXT,
ADD COLUMN     "stravaConnectedAt" TIMESTAMP(3),
ADD COLUMN     "stravaRefreshToken" TEXT,
ADD COLUMN     "unitSystem" TEXT NOT NULL DEFAULT 'metric';

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaAthleteId_key" ON "User"("stravaAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "User_garminUserId_key" ON "User"("garminUserId");
