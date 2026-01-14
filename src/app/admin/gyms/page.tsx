import Link from "next/link";
import { Plus, Edit, Building2, Users, Dumbbell } from "lucide-react";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function GymsPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const gyms = await db.gym.findMany({
    orderBy: { name: "asc" },
    include: {
      owner: {
        select: { email: true },
      },
      _count: {
        select: { 
          members: true,
          challenges: true,
          equipment: true,
        },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gyms</h1>
          <p className="text-muted-foreground">
            Manage gym locations, equipment, and members
          </p>
        </div>
        <Link href="/admin/gyms/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Gym
          </Button>
        </Link>
      </div>

      {gyms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No gyms created yet</p>
          <p className="text-sm">Create your first gym to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {gyms.map((gym) => (
            <div
              key={gym.id}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
            >
              {/* Icon/Logo */}
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {gym.logoUrl ? (
                  <img 
                    src={gym.logoUrl} 
                    alt={gym.name} 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Building2 className="w-7 h-7 text-primary" />
                )}
              </div>

              {/* Name & Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{gym.name}</h3>
                  {!gym.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Inactive
                    </span>
                  )}
                  {gym.isVerified && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {[gym.city, gym.state].filter(Boolean).join(", ") || "No location set"}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {gym._count.members} member{gym._count.members === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" />
                    {gym._count.equipment} equipment
                  </span>
                  <span>
                    {gym._count.challenges} challenge{gym._count.challenges === 1 ? "" : "s"}
                  </span>
                  {gym.disciplines.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex gap-1">
                        {gym.disciplines.slice(0, 3).map((d) => (
                          <span 
                            key={d.discipline.id} 
                            className="px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                          >
                            {d.discipline.icon} {d.discipline.name}
                          </span>
                        ))}
                        {gym.disciplines.length > 3 && (
                          <span className="text-muted-foreground">
                            +{gym.disciplines.length - 3} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <Link href={`/admin/gyms/${gym.id}`}>
                <Button variant="ghost" size="icon">
                  <Edit className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
