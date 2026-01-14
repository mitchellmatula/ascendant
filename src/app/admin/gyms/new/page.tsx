import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { GymForm } from "@/components/admin/gym-form";

export default async function NewGymPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const [disciplines, equipment, equipmentPackages] = await Promise.all([
    db.discipline.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    db.equipment.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    db.equipmentPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Gym</h1>
        <p className="text-muted-foreground">Add a new gym location</p>
      </div>

      <GymForm 
        disciplines={disciplines} 
        equipment={equipment} 
        equipmentPackages={equipmentPackages}
        mode="create" 
      />
    </div>
  );
}
