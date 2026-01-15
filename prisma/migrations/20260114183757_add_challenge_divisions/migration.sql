-- CreateTable
CREATE TABLE "ChallengeDivision" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeDivision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeDivision_challengeId_divisionId_key" ON "ChallengeDivision"("challengeId", "divisionId");

-- AddForeignKey
ALTER TABLE "ChallengeDivision" ADD CONSTRAINT "ChallengeDivision_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeDivision" ADD CONSTRAINT "ChallengeDivision_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;
