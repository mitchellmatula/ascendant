import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { EquipmentForm } from "@/components/admin/equipment-form";

export default async function NewEquipmentPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const disciplines = await db.discipline.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, icon: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Equipment</h1>
        <p className="text-muted-foreground">Add gym equipment that challenges may require</p>
      </div>

      <EquipmentForm disciplines={disciplines} mode="create" />
    </div>
  );
}
