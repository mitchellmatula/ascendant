import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { 
  ArrowLeft, 
  Target, 
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import { formatSecondsToTime } from "@/lib/time";

interface AthleteDetailPageProps {
  params: Promise<{ id: string; athleteId: string }>;
}

const TIER_COLORS: Record<string, string> = {
  S: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black",
  A: "bg-red-500 text-white",
  B: "bg-orange-500 text-white",
  C: "bg-yellow-500 text-black",
  D: "bg-green-500 text-white",
  E: "bg-blue-500 text-white",
  F: "bg-gray-500 text-white",
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Minus className="w-3 h-3" />
      </Badge>
    );
  }
  return (
    <Badge className={`${TIER_COLORS[tier] || "bg-gray-500"} font-bold`}>
      {tier}
    </Badge>
  );
}

function formatGradeValue(
  value: number | null,
  gradingType: string,
  timeFormat?: string | null
): string {
  if (value === null) return "-";
  
  switch (gradingType) {
    case "REPS":
    case "TIMED_REPS":
      return `${value} reps`;
    case "TIME":
      // timeFormat from challenge is "S" or "MS" - map to time.ts format
      return formatSecondsToTime(value, "mm:ss");
    case "DISTANCE":
      return `${value}m`;
    case "PASS_FAIL":
      return value === 1 ? "Pass" : "Fail";
    default:
      return String(value);
  }
}

export default async function ClassAthleteDetailPage({ params }: AthleteDetailPageProps) {
  const { id: classId, athleteId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user is a coach of this class
  const coachAssignment = await db.classCoach.findUnique({
    where: {
      classId_userId: {
        classId,
        userId: user.id,
      },
    },
  });

  if (!coachAssignment) {
    notFound();
  }

  // Get class data
  const classData = await db.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!classData) {
    notFound();
  }

  // Verify athlete is a member of this class
  const membership = await db.classMember.findUnique({
    where: {
      classId_athleteId: {
        classId,
        athleteId,
      },
    },
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
  });

  if (!membership || membership.status !== "ACTIVE") {
    notFound();
  }

  // Get all class benchmarks with this athlete's grades
  const benchmarks = await db.classBenchmark.findMany({
    where: { classId },
    include: {
      challenge: {
        select: {
          id: true,
          name: true,
          slug: true,
          gradingType: true,
          timeFormat: true,
          primaryDomain: { select: { name: true, icon: true, color: true } },
        },
      },
      grades: {
        where: { athleteId },
        orderBy: { gradedAt: "desc" },
        take: 1,
        include: {
          gradedBy: {
            select: {
              athlete: { select: { displayName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get athlete's submissions for these challenges
  const challengeIds = benchmarks.map(b => b.challengeId);
  const submissions = await db.challengeSubmission.findMany({
    where: {
      athleteId,
      challengeId: { in: challengeIds },
    },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      challengeId: true,
      status: true,
      achievedRank: true,
      achievedValue: true,
      submittedAt: true,
    },
  });

  // Group submissions by challenge
  const submissionsByChallenge = submissions.reduce((acc, sub) => {
    if (!acc[sub.challengeId]) {
      acc[sub.challengeId] = [];
    }
    acc[sub.challengeId].push(sub);
    return acc;
  }, {} as Record<string, typeof submissions>);

  // Calculate stats
  const gradedBenchmarks = benchmarks.filter(b => b.grades.length > 0);
  const totalGrades = gradedBenchmarks.length;
  const tierCounts = gradedBenchmarks.reduce((acc, b) => {
    const tier = b.grades[0]?.achievedTier;
    if (tier) {
      acc[tier] = (acc[tier] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Find highest tier achieved
  const tierOrder = ["S", "A", "B", "C", "D", "E", "F"];
  const highestTier = tierOrder.find(t => tierCounts[t] > 0) || null;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6">
        <Link
          href={`/coach/classes/${classId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {classData.name}
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={membership.athlete.avatarUrl || undefined} />
              <AvatarFallback className="text-lg">
                {membership.athlete.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {membership.athlete.displayName}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {new Date(membership.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <Button asChild>
            <Link href={`/coach/classes/${classId}/grade?athlete=${athleteId}`}>
              <Target className="w-4 h-4 mr-2" />
              Grade Athlete
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalGrades}</p>
                <p className="text-xs text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {benchmarks.length > 0 
                    ? Math.round((totalGrades / benchmarks.length) * 100) 
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                {highestTier ? (
                  <TierBadge tier={highestTier} />
                ) : (
                  <p className="text-2xl font-bold">-</p>
                )}
                <p className="text-xs text-muted-foreground">Best Tier</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submissions.length}</p>
                <p className="text-xs text-muted-foreground">Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benchmarks Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Benchmark Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {benchmarks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No benchmarks set for this class yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {benchmarks.map((benchmark) => {
                const grade = benchmark.grades[0];
                const challengeSubmissions = submissionsByChallenge[benchmark.challengeId] || [];
                const latestSubmission = challengeSubmissions[0];
                
                return (
                  <div 
                    key={benchmark.id} 
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {benchmark.challenge.primaryDomain?.icon || "🎯"}
                        </span>
                        <div>
                          <Link 
                            href={`/challenges/${benchmark.challenge.slug}`}
                            className="font-medium hover:underline"
                          >
                            {benchmark.challenge.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {benchmark.challenge.primaryDomain?.name}
                          </p>
                        </div>
                      </div>
                      <TierBadge tier={grade?.achievedTier || null} />
                    </div>
                    
                    {grade ? (
                      <div className="mt-3 pt-3 border-t text-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <div className="flex items-center gap-4">
                            {grade.achievedValue !== null && (
                              <span>
                                {formatGradeValue(
                                  grade.achievedValue, 
                                  benchmark.challenge.gradingType,
                                  benchmark.challenge.timeFormat
                                )}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(grade.gradedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {grade.gradedBy?.athlete?.displayName && (
                            <span className="text-xs">
                              by {grade.gradedBy.athlete.displayName}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">Not yet graded</p>
                        {latestSubmission && (
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            {latestSubmission.status === "APPROVED" ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : latestSubmission.status === "REJECTED" ? (
                              <XCircle className="w-3 h-3 text-red-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-500" />
                            )}
                            <span className="text-muted-foreground">
                              Has {challengeSubmissions.length} submission{challengeSubmissions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submissions.slice(0, 5).map((submission) => {
                const benchmark = benchmarks.find(b => b.challengeId === submission.challengeId);
                if (!benchmark) return null;
                
                return (
                  <Link 
                    key={submission.id}
                    href={`/submissions/${submission.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {benchmark.challenge.primaryDomain?.icon || "🎯"}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{benchmark.challenge.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {submission.achievedRank && <TierBadge tier={submission.achievedRank} />}
                      <Badge 
                        variant={
                          submission.status === "APPROVED" ? "default" :
                          submission.status === "REJECTED" ? "destructive" : "secondary"
                        }
                      >
                        {submission.status}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
