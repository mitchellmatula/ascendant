import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, getAllAthletes } from "@/lib/auth";
import { getActiveAthleteId } from "@/lib/active-athlete";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  GraduationCap,
  Users,
  Target,
  MapPin,
  ArrowLeft,
  Lock,
  Globe,
  Settings,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { JoinClassButton } from "./join-class-button";
import { ProgressLink } from "./progress-link";
import { LeaveClassButton } from "./leave-class-button";

interface ClassPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassPage({ params }: ClassPageProps) {
  const { id } = await params;
  
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding (has own athlete OR manages athletes)
  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  // Get all athletes this user has access to
  const allAthletes = getAllAthletes(user);
  const athleteIds = allAthletes.map(a => a.id);
  const isParent = user.managedAthletes.length > 0;
  const activeAthleteId = await getActiveAthleteId();

  const classData = await db.class.findUnique({
    where: { id },
    include: {
      gym: {
        select: { id: true, name: true, slug: true },
      },
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
        select: { members: true, benchmarks: true },
      },
    },
  });

  if (!classData) {
    notFound();
  }

  // Check which of our athletes are members of this class
  const memberships = await db.classMember.findMany({
    where: {
      classId: id,
      athleteId: { in: athleteIds },
      status: "ACTIVE",
    },
    include: {
      athlete: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const memberAthleteIds = memberships.map(m => m.athleteId);
  const hasAnyMember = memberships.length > 0;

  // Check for pending join requests for any of our athletes
  const joinRequests = await db.classJoinRequest.findMany({
    where: {
      classId: id,
      athleteId: { in: athleteIds },
    },
    include: {
      athlete: {
        select: { id: true, displayName: true },
      },
    },
  });

  // Check if user is a coach of this class
  const isCoach = await db.classCoach.findUnique({
    where: {
      classId_userId: {
        classId: id,
        userId: user.id,
      },
    },
  });

  // For private classes, only show to members, coaches, or gym members
  if (!classData.isPublic && !hasAnyMember && !isCoach) {
    // Check if user is a gym member
    const gymMembership = classData.gym
      ? await db.gymMember.findUnique({
          where: {
            gymId_userId: {
              gymId: classData.gym.id,
              userId: user.id,
            },
          },
        })
      : null;

    if (!gymMembership) {
      notFound();
    }
  }

  const headCoach = classData.coaches[0]?.user?.athlete;

  // Get benchmarks with grades for ALL member athletes
  const benchmarks = await db.classBenchmark.findMany({
    where: { classId: id },
    include: {
      challenge: {
        select: { name: true, slug: true },
      },
      grades: hasAnyMember ? {
        where: { athleteId: { in: memberAthleteIds } },
        include: {
          athlete: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      } : false,
    },
    orderBy: { createdAt: "desc" },
  });

  // For determining join button state, use first non-member athlete
  const nonMemberAthletes = allAthletes.filter(a => !memberAthleteIds.includes(a.id));
  const pendingRequests = joinRequests.filter(r => r.status === "PENDING");
  const deniedRequests = joinRequests.filter(r => r.status === "DENIED");

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      <Link
        href="/classes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Classes
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <GraduationCap className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-xl">{classData.name}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 mt-1">
                  {classData.isPublic ? (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      Public Class
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Private Class
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCoach && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/coach/classes/${id}`}>
                    <Settings className="w-4 h-4 mr-1" />
                    Manage
                  </Link>
                </Button>
              )}
              {memberships.length > 0 && !isCoach && (
                <LeaveClassButton
                  classId={id}
                  className={classData.name}
                  memberAthletes={memberships.map(m => ({
                    id: m.athlete.id,
                    displayName: m.athlete.displayName,
                  }))}
                  isParent={isParent}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {classData.description && (
            <p className="text-sm text-muted-foreground">{classData.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {headCoach && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={headCoach.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {headCoach.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground">
                  Coach: <span className="font-medium text-foreground">{headCoach.displayName}</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{classData._count.members} athletes</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>{classData._count.benchmarks} benchmarks</span>
            </div>
          </div>

          {classData.gym && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <Link href={`/gym/${classData.gym.slug}`} className="hover:underline">
                {classData.gym.name}
              </Link>
            </div>
          )}

          {/* Membership Status Section - Show all athletes' status for parents */}
          <div className="pt-2 space-y-2">
            {/* Show enrolled athletes */}
            {memberships.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {isParent ? "Enrolled:" : "You're a member of this class"}
                    </span>
                    {isParent && (
                      <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                        {memberships.map(m => m.athlete.displayName).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show pending requests */}
            {pendingRequests.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      Pending approval:
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 ml-1">
                      {pendingRequests.map(r => r.athlete.displayName).join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Show denied requests */}
            {deniedRequests.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-red-700 dark:text-red-300">
                      Request denied:
                    </span>
                    <span className="text-red-600 dark:text-red-400 ml-1">
                      {deniedRequests.map(r => r.athlete.displayName).join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Show join button if there are enrollable athletes (not members, no pending requests) */}
            {(() => {
              const enrollableAthletes = nonMemberAthletes.filter(a => 
                !pendingRequests.some(r => r.athleteId === a.id)
              );
              return enrollableAthletes.length > 0 && !isCoach ? (
                <JoinClassButton
                  classId={id}
                  className={classData.name}
                  requiresApproval={classData.requiresApproval}
                  athletes={enrollableAthletes}
                />
              ) : null;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Benchmarks with Progress for ALL enrolled athletes */}
      {benchmarks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              {hasAnyMember ? (isParent ? "Progress" : "Your Progress") : "Benchmarks"}
            </CardTitle>
            <CardDescription>
              {hasAnyMember 
                ? (isParent ? "Grades on class benchmarks" : "Your grades on class benchmarks")
                : "Challenges this class is working on"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {benchmarks.map((benchmark) => {
                const grades = hasAnyMember && benchmark.grades ? benchmark.grades : [];
                const hasAnyGrade = grades.length > 0;
                
                return (
                  <div
                    key={benchmark.id}
                    className={`p-3 rounded-lg ${
                      hasAnyGrade 
                        ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800" 
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <Link 
                          href={`/challenges/${benchmark.challenge.slug}`}
                          className="font-medium text-sm truncate hover:text-accent transition-colors block"
                        >
                          {benchmark.challenge.name}
                        </Link>
                        {benchmark.targetTier && (
                          <span className="text-xs text-muted-foreground">
                            Target: {benchmark.targetTier}
                          </span>
                        )}
                      </div>
                      {!hasAnyMember && benchmark.dueDate && (
                        <Badge variant="outline" className="shrink-0 ml-2">
                          Due: {new Date(benchmark.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Show grades for each athlete (parent view) */}
                    {hasAnyMember && isParent && (
                      <div className="mt-2 space-y-1.5">
                        {memberships.map((membership) => {
                          const athleteGrade = grades.find(g => g.athleteId === membership.athleteId) as {
                            athleteId: string;
                            achievedTier: string | null;
                            passed: boolean | null;
                            athlete: { id: string; displayName: string; avatarUrl: string | null };
                          } | undefined;
                          return (
                            <ProgressLink
                              key={membership.athleteId}
                              athlete={membership.athlete}
                              challengeSlug={benchmark.challenge.slug}
                              activeAthleteId={activeAthleteId}
                              grade={athleteGrade ? {
                                achievedTier: athleteGrade.achievedTier,
                                passed: athleteGrade.passed,
                              } : null}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Single athlete view (non-parent) */}
                    {hasAnyMember && !isParent && (
                      <div className="mt-2 flex items-center justify-end">
                        {grades[0] ? (
                          <>
                            {grades[0].achievedTier && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                                {grades[0].achievedTier}-tier
                              </Badge>
                            )}
                            {grades[0].passed !== null && !grades[0].achievedTier && (
                              <Badge variant={grades[0].passed ? "default" : "destructive"}>
                                {grades[0].passed ? "Pass" : "Fail"}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Not graded
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {!hasAnyMember && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Join the class to track your progress on these benchmarks
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
