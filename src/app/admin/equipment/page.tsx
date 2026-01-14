import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EquipmentActions } from "./equipment-actions";

export default async function EquipmentPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const equipment = await db.equipment.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { challenges: true },
      },
      disciplines: {
        include: {
          discipline: {
            select: { id: true, name: true, icon: true },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Equipment</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage gym equipment for challenges
          </p>
        </div>
        <Link href="/admin/equipment/new">
          <Button size="lg" className="w-full sm:w-auto">
            + Add Equipment
          </Button>
        </Link>
      </div>

      {equipment.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No equipment has been created yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Equipment defines what gyms need to have for athletes to complete challenges.
              Gyms can then indicate which equipment they have available.
            </p>
            <Link href="/admin/equipment/new">
              <Button>Create Your First Equipment</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {equipment.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex items-center p-4 gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0 bg-muted">
                  {item.icon || "🏋️"}
                </div>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    {!item.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description || "No description"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      Used in {item._count.challenges} challenge{item._count.challenges === 1 ? "" : "s"}
                    </p>
                    {item.disciplines.length > 0 && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex gap-1">
                          {item.disciplines.map((d) => (
                            <span key={d.discipline.id} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {d.discipline.icon} {d.discipline.name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <EquipmentActions equipment={item} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {equipment.length > 0 && equipment.length < 5 && (
        <Card className="bg-muted/50">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Tip: Common equipment includes <strong>Salmon Ladder</strong>, <strong>Warped Wall</strong>, <strong>Pull-up Bar</strong>, <strong>Rings</strong>, and <strong>Peg Board</strong>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
