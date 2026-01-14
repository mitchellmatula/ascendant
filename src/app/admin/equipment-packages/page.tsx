import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EquipmentPackageActions } from "./package-actions";
import { Package } from "lucide-react";

export default async function EquipmentPackagesPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const packages = await db.equipmentPackage.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        include: {
          equipment: {
            select: { id: true, name: true, icon: true },
          },
        },
      },
      _count: {
        select: { items: true },
      },
    },
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Equipment Packages</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Preset equipment collections for quick gym setup
          </p>
        </div>
        <Link href="/admin/equipment-packages/new">
          <Button size="lg" className="w-full sm:w-auto">
            + Create Package
          </Button>
        </Link>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No equipment packages have been created yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Equipment packages let gym owners quickly add all the equipment they have
              by selecting a preset package like &quot;Standard Ninja Gym&quot; instead of
              selecting each piece individually.
            </p>
            <Link href="/admin/equipment-packages/new">
              <Button>Create Your First Package</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="overflow-hidden">
              <div className="flex items-start p-4 gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0 bg-muted">
                  {pkg.icon || "📦"}
                </div>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{pkg.name}</h3>
                    {!pkg.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {pkg._count.items} item{pkg._count.items === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {pkg.description}
                    </p>
                  )}
                  
                  {/* Equipment Preview */}
                  {pkg.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {pkg.items.slice(0, 8).map((item) => (
                        <Badge 
                          key={item.id} 
                          variant="outline" 
                          className="text-xs font-normal"
                        >
                          {item.equipment.icon && (
                            <span className="mr-1">{item.equipment.icon}</span>
                          )}
                          {item.equipment.name}
                          {item.quantity > 1 && (
                            <span className="ml-1 text-muted-foreground">
                              ×{item.quantity}
                            </span>
                          )}
                        </Badge>
                      ))}
                      {pkg.items.length > 8 && (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          +{pkg.items.length - 8} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <EquipmentPackageActions package={pkg} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {packages.length > 0 && packages.length < 3 && (
        <Card className="bg-muted/50">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Suggested packages: <strong>Standard Ninja Gym</strong>, <strong>Basic Fitness Center</strong>, <strong>CrossFit Box</strong>, <strong>Calisthenics Park</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
