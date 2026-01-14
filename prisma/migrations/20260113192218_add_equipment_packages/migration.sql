-- CreateTable
CREATE TABLE "EquipmentPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentPackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentPackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPackage_name_key" ON "EquipmentPackage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPackage_slug_key" ON "EquipmentPackage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPackageItem_packageId_equipmentId_key" ON "EquipmentPackageItem"("packageId", "equipmentId");

-- AddForeignKey
ALTER TABLE "EquipmentPackageItem" ADD CONSTRAINT "EquipmentPackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "EquipmentPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPackageItem" ADD CONSTRAINT "EquipmentPackageItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
