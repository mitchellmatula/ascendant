import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DisciplineActions } from "./discipline-actions";

export default async function DisciplinesPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const disciplines = await db.discipline.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { challenges: true },
      },
    },
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Disciplines</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage sports and training disciplines
          </p>
        </div>
        <Link href="/admin/disciplines/new">
          <Button size="lg" className="w-full sm:w-auto">
            + Add Discipline
          </Button>
        </Link>
      </div>

      {disciplines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No disciplines have been created yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Disciplines are sports or activities like Ninja, Calisthenics, Parkour, etc.
              Challenges can be tagged with disciplines for easy filtering.
            </p>
            <Link href="/admin/disciplines/new">
              <Button>Create Your First Discipline</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {disciplines.map((discipline) => (
            <Card key={discipline.id} className="overflow-hidden">
              <div className="flex items-center p-4 gap-4">
                {/* Icon & Color indicator */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: discipline.color ? `${discipline.color}20` : undefined }}
                >
                  {discipline.icon || "🎯"}
                </div>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{discipline.name}</h3>
                    {!discipline.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {discipline.description || "No description"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {discipline._count.challenges} challenge{discipline._count.challenges === 1 ? "" : "s"}
                  </p>
                </div>

                {/* Color swatch */}
                <div
                  className="w-4 h-12 rounded shrink-0 hidden sm:block"
                  style={{ backgroundColor: discipline.color || "#3b82f6" }}
                />

                {/* Actions */}
                <DisciplineActions discipline={discipline} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {disciplines.length > 0 && disciplines.length < 4 && (
        <Card className="bg-muted/50">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Tip: Common disciplines include <strong>Ninja</strong>, <strong>Calisthenics</strong>, <strong>Parkour</strong>, <strong>CrossFit</strong>, and <strong>Rock Climbing</strong>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
