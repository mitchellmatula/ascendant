/*
  Warnings:

  - You are about to drop the column `difficulty` on the `Challenge` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Challenge" DROP COLUMN "difficulty",
ADD COLUMN     "xpPerTier" INTEGER NOT NULL DEFAULT 50;
