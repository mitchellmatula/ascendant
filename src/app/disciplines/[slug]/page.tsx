import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Trophy, Clock, Target, ChevronLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function DisciplineChallengesContent({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  const athlete = user.athlete ?? user.managedAthletes[0];
  const { slug } = await params;

  // Get the discipline
  const discipline = await db.discipline.findUnique({
    where: { slug, isActive: true },
  });

  if (!discipline) {
    notFound();
  }

  // Get challenges for this discipline
  const challenges = await db.challenge.findMany({
    where: {
      isActive: true,
      gymId: null,
      disciplines: {
        some: { disciplineId: discipline.id },
      },
    },
    include: {
      primaryDomain: { select: { id: true, name: true, icon: true, color: true } },
      disciplines: { include: { discipline: true } },
      categories: { include: { category: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { name: "asc" },
  });

  // Get athlete's submissions
  const submissions = await db.challengeSubmission.findMany({
    where: { 
      athleteId: athlete.id,
      challengeId: { in: challenges.map(c => c.id) },
    },
    select: { challengeId: true, status: true, achievedRank: true },
  });

  const submissionMap = new Map(submissions.map(s => [s.challengeId, s]));

  // Check if athlete follows this discipline
  const isFollowing = await db.athleteDiscipline.findFirst({
    where: { athleteId: athlete.id, disciplineId: discipline.id },
  });

  // Grading type display
  const gradingTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    PASS_FAIL: { label: "Pass/Fail", icon: <Target className="w-3 h-3" /> },
    REPS: { label: "Reps", icon: <Dumbbell className="w-3 h-3" /> },
    TIME: { label: "Timed", icon: <Clock className="w-3 h-3" /> },
    DISTANCE: { label: "Distance", icon: <Target className="w-3 h-3" /> },
    TIMED_REPS: { label: "Timed Reps", icon: <Clock className="w-3 h-3" /> },
  };

  const completedCount = challenges.filter(c => 
    submissionMap.get(c.id)?.status === "APPROVED"
  ).length;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Back button */}
      <Link 
        href="/challenges" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Challenges
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0"
          style={{ 
            backgroundColor: discipline.color 
              ? `${discipline.color}20` 
              : undefined 
          }}
        >
          {discipline.icon || "🏋️"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold">{discipline.name}</h1>
            {isFollowing && (
              <Badge variant="secondary">Following</Badge>
            )}
          </div>
          {discipline.description && (
            <p className="text-muted-foreground">{discipline.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{challenges.length}</div>
            <div className="text-xs text-muted-foreground">Challenges</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{completedCount}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {challenges.length - completedCount}
            </div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </CardContent>
        </Card>
      </div>

      {/* Challenges Grid */}
      {challenges.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {challenges.map(challenge => {
            const submission = submissionMap.get(challenge.id);
            const grading = gradingTypeLabels[challenge.gradingType] || { label: challenge.gradingType, icon: null };

            return (
              <Link key={challenge.id} href={`/challenges/${challenge.slug}`} className="block group">
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 overflow-hidden">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted">
                    {challenge.demoImageUrl ? (
                      <Image
                        src={challenge.demoImageUrl}
                        alt={challenge.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Trophy className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    
                    {/* Status badge overlay */}
                    {submission && (
                      <div className="absolute top-2 right-2">
                        {submission.status === "APPROVED" ? (
                          <Badge className="bg-green-500 text-white">
                            {submission.achievedRank || "✓"} Completed
                          </Badge>
                        ) : submission.status === "PENDING" ? (
                          <Badge variant="secondary">Pending</Badge>
                        ) : submission.status === "REJECTED" ? (
                          <Badge variant="destructive">Rejected</Badge>
                        ) : null}
                      </div>
                    )}

                    {/* Domain badge */}
                    <div className="absolute bottom-2 left-2">
                      <Badge 
                        variant="secondary"
                        className="text-xs backdrop-blur-sm"
                        style={{ 
                          backgroundColor: challenge.primaryDomain.color 
                            ? `${challenge.primaryDomain.color}dd` 
                            : undefined,
                          color: "white",
                        }}
                      >
                        {challenge.primaryDomain.icon} {challenge.primaryDomain.name}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                      {challenge.name}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {challenge.description}
                    </p>

                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="outline" className="text-xs gap-1">
                        {grading.icon}
                        {grading.label}
                      </Badge>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      {challenge._count.submissions} submission{challenge._count.submissions !== 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No challenges yet</h3>
            <p className="text-muted-foreground">
              There are no challenges available for {discipline.name} yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DisciplineChallengesPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-muted rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-4 w-64 bg-muted rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-[4/3] bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    }>
      <DisciplineChallengesContent params={params} />
    </Suspense>
  );
}
