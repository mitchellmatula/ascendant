import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { EquipmentPackageForm } from "@/components/admin/equipment-package-form";

export default async function NewEquipmentPackagePage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const equipment = await db.equipment.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, icon: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Equipment Package</h1>
        <p className="text-muted-foreground">
          Create a preset collection of equipment for quick gym setup
        </p>
      </div>

      <EquipmentPackageForm equipment={equipment} mode="create" />
    </div>
  );
}
