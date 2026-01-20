import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { 
  ArrowLeft, 
  Users, 
  Target, 
  ClipboardCheck, 
  Settings, 
  UserPlus, 
  Bell,
  ChevronRight,
  GraduationCap,
  Plus
} from "lucide-react";

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user is a coach of this class
  const coachAssignment = await db.classCoach.findUnique({
    where: {
      classId_userId: {
        classId: id,
        userId: user.id,
      },
    },
  });

  if (!coachAssignment) {
    notFound();
  }

  const classData = await db.class.findUnique({
    where: { id },
    include: {
      gym: { select: { id: true, name: true, slug: true, logoUrl: true } },
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
      members: {
        where: { status: "ACTIVE" },
        include: {
          athlete: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              user: { select: { email: true } },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      benchmarks: {
        include: {
          challenge: {
            select: {
              id: true,
              name: true,
              primaryDomain: { select: { name: true, icon: true, color: true } },
            },
          },
          _count: {
            select: { grades: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          joinRequests: { where: { status: "PENDING" } },
        },
      },
    },
  });

  if (!classData) {
    notFound();
  }

  const isHeadCoach = coachAssignment.role === "COACH";
  const pendingRequestCount = classData._count.joinRequests;

  // Calculate grading progress
  const totalGradesNeeded = classData.benchmarks.length * classData.members.length;
  const totalGradesDone = classData.benchmarks.reduce((acc, b) => acc + b._count.grades, 0);
  const gradingProgress = totalGradesNeeded > 0 
    ? Math.round((totalGradesDone / totalGradesNeeded) * 100) 
    : 0;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6">
        <Link
          href="/coach"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {classData.gym?.logoUrl ? (
              <Avatar className="h-14 w-14">
                <AvatarImage src={classData.gym.logoUrl} alt={classData.gym.name} />
                <AvatarFallback>{classData.gym.name[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{classData.name}</h1>
                <Badge variant={isHeadCoach ? "default" : "secondary"}>
                  {isHeadCoach ? "Head Coach" : "Assistant"}
                </Badge>
                {!classData.isActive && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Archived
                  </Badge>
                )}
              </div>
              {classData.gym && (
                <Link 
                  href={`/gym/${classData.gym.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {classData.gym.name}
                </Link>
              )}
            </div>
          </div>
          
          {isHeadCoach && (
            <Button variant="outline" asChild>
              <Link href={`/coach/classes/${id}/settings`}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </Button>
          )}
        </div>
        
        {classData.description && (
          <p className="text-muted-foreground mt-4">{classData.description}</p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{classData.members.length}</p>
                <p className="text-xs text-muted-foreground">Athletes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Target className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{classData.benchmarks.length}</p>
                <p className="text-xs text-muted-foreground">Benchmarks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gradingProgress}%</p>
                <p className="text-xs text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {pendingRequestCount > 0 && (
          <Link href={`/coach/classes/${id}/requests`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg relative">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {pendingRequestCount}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingRequestCount}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button asChild>
          <Link href={`/coach/classes/${id}/grade`}>
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Quick Grade
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/coach/classes/${id}/members`}>
            <UserPlus className="w-4 h-4 mr-2" />
            Manage Members
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/coach/classes/${id}/benchmarks`}>
            <Target className="w-4 h-4 mr-2" />
            Manage Benchmarks
          </Link>
        </Button>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="athletes" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="athletes" className="flex-1 md:flex-initial">Athletes</TabsTrigger>
          <TabsTrigger value="benchmarks" className="flex-1 md:flex-initial">Benchmarks</TabsTrigger>
          <TabsTrigger value="coaches" className="flex-1 md:flex-initial">Coaches</TabsTrigger>
        </TabsList>

        <TabsContent value="athletes" className="mt-6">
          {classData.members.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No Athletes Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add athletes to start tracking their progress.
                </p>
                <Button asChild>
                  <Link href={`/coach/classes/${id}/members`}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Athletes
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {classData.members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.athlete.avatarUrl || undefined} />
                        <AvatarFallback>
                          {member.athlete.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.athlete.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link href={`/coach/classes/${id}/athletes/${member.athleteId}`}>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-6">
          {classData.benchmarks.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No Benchmarks Set</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add challenges as benchmarks to track athlete progress.
                </p>
                <Button asChild>
                  <Link href={`/coach/classes/${id}/benchmarks`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Benchmarks
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {classData.benchmarks.map((benchmark) => (
                <Card key={benchmark.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {benchmark.challenge.primaryDomain?.icon || "🎯"}
                        </span>
                        <div>
                          <p className="font-medium">{benchmark.challenge.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {benchmark._count.grades} / {classData.members.length} graded
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all"
                            style={{ 
                              width: `${classData.members.length > 0 
                                ? (benchmark._count.grades / classData.members.length) * 100 
                                : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coaches" className="mt-6">
          <div className="space-y-3">
            {classData.coaches.map((coach) => (
              <Card key={coach.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={coach.user.athlete?.avatarUrl || undefined} />
                      <AvatarFallback>
                        {(coach.user.athlete?.displayName || "C").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {coach.user.athlete?.displayName || "Coach"}
                      </p>
                      <Badge variant={coach.role === "COACH" ? "default" : "secondary"} className="text-xs">
                        {coach.role === "COACH" ? "Head Coach" : "Assistant"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {isHeadCoach && (
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/coach/classes/${id}/coaches`}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Coach
                </Link>
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
