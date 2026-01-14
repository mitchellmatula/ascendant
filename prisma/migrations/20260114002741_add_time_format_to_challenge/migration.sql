-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "timeFormat" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reviewAccuracy" DOUBLE PRECISION,
ADD COLUMN     "reviewBanReason" TEXT,
ADD COLUMN     "reviewBannedAt" TIMESTAMP(3),
ADD COLUMN     "reviewBannedBy" TEXT,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suspendReason" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedBy" TEXT;
