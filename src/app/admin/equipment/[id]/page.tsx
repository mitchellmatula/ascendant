import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EquipmentForm } from "@/components/admin/equipment-form";

interface EditEquipmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEquipmentPage({ params }: EditEquipmentPageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { id } = await params;
  
  const [equipment, disciplines] = await Promise.all([
    db.equipment.findUnique({
      where: { id },
      include: {
        disciplines: {
          include: {
            discipline: {
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
  ]);

  if (!equipment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Equipment</h1>
        <p className="text-muted-foreground">Update {equipment.name}</p>
      </div>

      <EquipmentForm equipment={equipment} disciplines={disciplines} mode="edit" />
    </div>
  );
}
