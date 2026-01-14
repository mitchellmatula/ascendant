import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { GymForm } from "@/components/admin/gym-form";

interface EditGymPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGymPage({ params }: EditGymPageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { id } = await params;
  
  const [gym, disciplines, equipment, equipmentPackages] = await Promise.all([
    db.gym.findUnique({
      where: { id },
      include: {
        disciplines: {
          include: {
            discipline: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
        equipment: {
          include: {
            equipment: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    }),
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

  if (!gym) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Gym</h1>
        <p className="text-muted-foreground">Update {gym.name}</p>
      </div>

      <GymForm 
        gym={gym} 
        disciplines={disciplines} 
        equipment={equipment} 
        equipmentPackages={equipmentPackages}
        mode="edit" 
      />
    </div>
  );
}
