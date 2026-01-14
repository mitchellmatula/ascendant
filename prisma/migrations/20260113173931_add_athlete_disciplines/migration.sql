-- CreateTable
CREATE TABLE "AthleteDiscipline" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AthleteDiscipline_athleteId_disciplineId_key" ON "AthleteDiscipline"("athleteId", "disciplineId");

-- AddForeignKey
ALTER TABLE "AthleteDiscipline" ADD CONSTRAINT "AthleteDiscipline_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDiscipline" ADD CONSTRAINT "AthleteDiscipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
