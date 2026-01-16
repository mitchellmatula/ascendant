-- AlterTable
ALTER TABLE "DomainLevel" ADD COLUMN     "breakthroughAchieved" TIMESTAMP(3),
ADD COLUMN     "breakthroughReady" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BreakthroughRule" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "fromRank" TEXT NOT NULL,
    "toRank" TEXT NOT NULL,
    "tierRequired" TEXT NOT NULL,
    "challengeCount" INTEGER NOT NULL,
    "divisionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreakthroughRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BreakthroughRule_domainId_fromRank_toRank_divisionId_key" ON "BreakthroughRule"("domainId", "fromRank", "toRank", "divisionId");

-- AddForeignKey
ALTER TABLE "BreakthroughRule" ADD CONSTRAINT "BreakthroughRule_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakthroughRule" ADD CONSTRAINT "BreakthroughRule_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
