-- CreateTable
CREATE TABLE "DisciplineEquipment" (
    "id" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisciplineEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisciplineEquipment_disciplineId_equipmentId_key" ON "DisciplineEquipment"("disciplineId", "equipmentId");

-- AddForeignKey
ALTER TABLE "DisciplineEquipment" ADD CONSTRAINT "DisciplineEquipment_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplineEquipment" ADD CONSTRAINT "DisciplineEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
