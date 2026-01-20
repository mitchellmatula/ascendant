import Link from "next/link";
import { GraduationCap, Users, Target, Trash2, Building2 } from "lucide-react";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteClassButton } from "./delete-class-button";

export default async function AdminClassesPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.role)) {
    redirect("/admin");
  }

  const classes = await db.class.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      gym: {
        select: { id: true, name: true, slug: true },
      },
      coaches: {
        include: {
          user: {
            include: { athlete: { select: { displayName: true } } },
          },
        },
      },
      _count: {
        select: { 
          members: true,
          benchmarks: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">
            Manage coaching classes across all gyms
          </p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No classes created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => {
            const headCoach = cls.coaches.find(c => c.isHeadCoach)?.user?.athlete?.displayName 
              || cls.coaches[0]?.user?.athlete?.displayName 
              || "Unknown";
            
            return (
              <div
                key={cls.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* Name & Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{cls.name}</h3>
                    {cls.isPublic ? (
                      <Badge variant="outline" className="text-xs">Public</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Private</Badge>
                    )}
                    {cls.requiresApproval && (
                      <Badge variant="outline" className="text-xs text-amber-600">Approval Required</Badge>
                    )}
                    {!cls.isActive && (
                      <Badge variant="destructive" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                    {cls.gym && (
                      <Link 
                        href={`/gym/${cls.gym.slug}`}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <Building2 className="w-3 h-3" />
                        {cls.gym.name}
                      </Link>
                    )}
                    <span>Coach: {headCoach}</span>
                  </div>

                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {cls._count.members} member{cls._count.members === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {cls._count.benchmarks} benchmark{cls._count.benchmarks === 1 ? "" : "s"}
                    </span>
                    <span className="text-muted-foreground/60">
                      ID: {cls.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link href={`/coach/classes/${cls.id}`}>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </Link>
                  <DeleteClassButton 
                    classId={cls.id} 
                    className={cls.name}
                    memberCount={cls._count.members}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Total: {classes.length} class{classes.length === 1 ? "" : "es"}
      </div>
    </div>
  );
}
