import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EquipmentPackageForm } from "@/components/admin/equipment-package-form";

interface EditEquipmentPackagePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEquipmentPackagePage({
  params,
}: EditEquipmentPackagePageProps) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const { id } = await params;

  const [pkg, equipment] = await Promise.all([
    db.equipmentPackage.findUnique({
      where: { id },
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
    db.equipment.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    }),
  ]);

  if (!pkg) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Equipment Package</h1>
        <p className="text-muted-foreground">
          Modify the &quot;{pkg.name}&quot; equipment package
        </p>
      </div>

      <EquipmentPackageForm package={pkg} equipment={equipment} mode="edit" />
    </div>
  );
}
