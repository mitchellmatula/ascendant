import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getAllAthletes } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, Users, Target, ChevronRight, Building2 } from "lucide-react";

export default async function MyClassesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding
  const hasProfile = user.athlete || (user.managedAthletes && user.managedAthletes.length > 0);
  if (!hasProfile) {
    redirect("/onboarding");
  }

  // Get all athletes this user has access to (own profile + managed children)
  const allAthletes = getAllAthletes(user);
  const athleteIds = allAthletes.map(a => a.id);
  const isParent = user.managedAthletes.length > 0;

  // Get all class memberships for ALL athletes this user manages
  const memberships = await db.classMember.findMany({
    where: { 
      athleteId: { in: athleteIds },
      status: "ACTIVE",
      class: { isActive: true },
    },
    include: {
      athlete: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      class: {
        include: {
          gym: { select: { id: true, name: true, slug: true } },
          coaches: {
            where: { isHeadCoach: true },
            include: {
              user: {
                include: { athlete: { select: { displayName: true, avatarUrl: true } } },
              },
            },
            take: 1,
          },
          _count: {
            select: { 
              members: { where: { status: "ACTIVE" } },
              benchmarks: { where: { isActive: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  // Group memberships by class (in case multiple kids are in same class)
  const classMap = new Map<string, {
    classData: typeof memberships[0]["class"];
    athletes: { id: string; displayName: string; avatarUrl: string | null }[];
  }>();

  for (const membership of memberships) {
    const existing = classMap.get(membership.classId);
    if (existing) {
      existing.athletes.push(membership.athlete);
    } else {
      classMap.set(membership.classId, {
        classData: membership.class,
        athletes: [membership.athlete],
      });
    }
  }

  const uniqueClasses = Array.from(classMap.values());

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="w-7 h-7" />
          {isParent ? "Kids' Classes" : "My Classes"}
        </h1>
        <p className="text-muted-foreground">
          {isParent 
            ? "Classes your children are enrolled in"
            : "Classes you're enrolled in"
          }
        </p>
      </div>

      {uniqueClasses.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
            <p className="text-muted-foreground mb-4">
              {isParent 
                ? "Your children haven't joined any classes yet. Check out gyms to find classes!"
                : "You haven't joined any classes. Check out gyms to find classes!"
              }
            </p>
            <Link 
              href="/gyms"
              className="text-primary hover:underline"
            >
              Browse Gyms →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {uniqueClasses.map(({ classData: cls, athletes }) => {
            const headCoach = cls.coaches[0]?.user?.athlete;
            const totalBenchmarks = cls._count.benchmarks;
            
            return (
              <Link key={cls.id} href={`/classes/${cls.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{cls.name}</h3>
                          {cls.isPublic && (
                            <Badge variant="outline" className="text-xs">Public</Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                          {cls.gym && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {cls.gym.name}
                            </span>
                          )}
                          {headCoach && (
                            <span className="flex items-center gap-1">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={headCoach.avatarUrl || undefined} />
                                <AvatarFallback className="text-[8px]">
                                  {headCoach.displayName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {headCoach.displayName}
                            </span>
                          )}
                        </div>

                        {/* Show which athletes are in this class (for parents) */}
                        {isParent && (
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-xs text-muted-foreground mr-1">Enrolled:</span>
                            <div className="flex -space-x-1">
                              {athletes.map((athlete) => (
                                <Avatar key={athlete.id} className="w-5 h-5 border-2 border-background">
                                  <AvatarImage src={athlete.avatarUrl || undefined} />
                                  <AvatarFallback className="text-[8px]">
                                    {athlete.displayName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground ml-1">
                              {athletes.map(a => a.displayName).join(", ")}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {cls._count.members} athletes
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {totalBenchmarks} benchmarks
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
