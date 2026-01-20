import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Plus, Users, Target, ClipboardList, ChevronRight, GraduationCap } from "lucide-react";

export default async function CoachDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get classes where user is a coach
  const coachAssignments = await db.classCoach.findMany({
    where: { userId: user.id },
    include: {
      class: {
        include: {
          gym: { select: { id: true, name: true, slug: true, logoUrl: true } },
          _count: {
            select: {
              members: { where: { status: "ACTIVE" } },
              benchmarks: true,
            },
          },
          coaches: {
            include: {
              user: {
                select: {
                  id: true,
                  athlete: { select: { displayName: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get pending join requests for classes user coaches
  const classIds = coachAssignments
    .filter((ca) => ca.role === "COACH")
    .map((ca) => ca.classId);

  const pendingRequests = await db.classJoinRequest.count({
    where: {
      classId: { in: classIds },
      status: "PENDING",
    },
  });

  // Count benchmarks needing grades
  const ungradedBenchmarks = classIds.length > 0 
    ? await db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT cb.id) as count
        FROM "ClassBenchmark" cb
        JOIN "ClassMember" cm ON cm."classId" = cb."classId" AND cm.status = 'ACTIVE'
        LEFT JOIN "ClassGrade" cg ON cg."benchmarkId" = cb.id AND cg."athleteId" = cm."athleteId"
        WHERE cb."classId" = ANY(${classIds}::text[])
        AND cg.id IS NULL
      `.then(r => Number(r[0]?.count ?? 0))
    : 0;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7" />
            Coach Dashboard
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage your classes and athletes
          </p>
        </div>
        <Button asChild>
          <Link href="/coach/classes/new">
            <Plus className="w-4 h-4 mr-2" />
            New Class
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{coachAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {coachAssignments.reduce((acc, ca) => acc + ca.class._count.members, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Athletes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <ClipboardList className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests}</p>
                <p className="text-xs text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ungradedBenchmarks}</p>
                <p className="text-xs text-muted-foreground">Needs Grading</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes List */}
      {coachAssignments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first class to start coaching athletes.
            </p>
            <Button asChild>
              <Link href="/coach/classes/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Classes</h2>
          {coachAssignments.map(({ class: classData, role }) => (
            <Link 
              key={classData.id} 
              href={`/coach/classes/${classData.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {classData.gym?.logoUrl ? (
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={classData.gym.logoUrl} alt={classData.gym.name} />
                          <AvatarFallback>{classData.gym.name[0]}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{classData.name}</h3>
                          <Badge variant={role === "COACH" ? "default" : "secondary"}>
                            {role === "COACH" ? "Head Coach" : "Assistant"}
                          </Badge>
                          {!classData.isActive && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Archived
                            </Badge>
                          )}
                        </div>
                        {classData.gym && (
                          <p className="text-sm text-muted-foreground truncate">
                            {classData.gym.name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {classData._count.members} athletes
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {classData._count.benchmarks} benchmarks
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
