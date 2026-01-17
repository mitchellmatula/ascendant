/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Athlete` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FeedVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW', 'REACTION', 'COMMENT', 'COMMENT_REPLY', 'COMMENT_LIKE', 'LEVEL_UP', 'TRAINING_SYNC', 'SUBMISSION_APPROVED', 'SUBMISSION_REJECTED');

-- AlterTable
ALTER TABLE "Athlete" ADD COLUMN     "feedVisibility" "FeedVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "submissionId" TEXT,
    "commentId" TEXT,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReport" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actorId" TEXT,
    "actorUsername" TEXT,
    "actorAvatar" TEXT,
    "submissionId" TEXT,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Reaction_submissionId_idx" ON "Reaction"("submissionId");

-- CreateIndex
CREATE INDEX "Reaction_commentId_idx" ON "Reaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_athleteId_submissionId_emoji_key" ON "Reaction"("athleteId", "submissionId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_athleteId_commentId_emoji_key" ON "Reaction"("athleteId", "commentId", "emoji");

-- CreateIndex
CREATE INDEX "Comment_submissionId_idx" ON "Comment"("submissionId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "CommentReport_commentId_idx" ON "CommentReport"("commentId");

-- CreateIndex
CREATE INDEX "CommentReport_status_idx" ON "CommentReport"("status");

-- CreateIndex
CREATE INDEX "Notification_athleteId_isRead_idx" ON "Notification"("athleteId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_athleteId_createdAt_idx" ON "Notification"("athleteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_username_key" ON "Athlete"("username");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ChallengeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ChallengeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
