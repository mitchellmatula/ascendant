-- AlterTable
ALTER TABLE "Athlete" ADD COLUMN     "isPublicProfile" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GymMember" ADD COLUMN     "isPublicMember" BOOLEAN NOT NULL DEFAULT false;
