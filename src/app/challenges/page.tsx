import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Trophy, Clock, Target, ChevronRight, Zap, Filter } from "lucide-react";

export const metadata = {
  title: "Challenges | Ascendant",
  description: "Browse challenges tailored to your disciplines",
};

async function ChallengesContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  const athlete = user.athlete ?? user.managedAthletes[0];

  // Get athlete's disciplines
  const athleteDisciplines = await db.athleteDiscipline.findMany({
    where: { athleteId: athlete.id },
    include: { discipline: true },
  });

  const disciplineIds = athleteDisciplines.map(ad => ad.disciplineId);

  // Get challenges for athlete's disciplines
  const myDisciplineChallenges = disciplineIds.length > 0 
    ? await db.challenge.findMany({
        where: {
          isActive: true,
          gymId: null, // Only global challenges
          disciplines: {
            some: { disciplineId: { in: disciplineIds } },
          },
        },
        include: {
          primaryDomain: { select: { id: true, name: true, icon: true, color: true } },
          disciplines: { include: { discipline: true } },
          categories: { include: { category: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { name: "asc" },
        take: 50,
      })
    : [];

  // Get all disciplines for filtering
  const allDisciplines = await db.discipline.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // Get popular/recent challenges (for "Discover" tab)
  const discoverChallenges = await db.challenge.findMany({
    where: {
      isActive: true,
      gymId: null,
      // Exclude ones already in my disciplines if we have any
      ...(disciplineIds.length > 0 && {
        NOT: {
          disciplines: {
            some: { disciplineId: { in: disciplineIds } },
          },
        },
      }),
    },
    include: {
      primaryDomain: { select: { id: true, name: true, icon: true, color: true } },
      disciplines: { include: { discipline: true } },
      categories: { include: { category: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { submissions: { _count: "desc" } },
    take: 20,
  });

  // Get athlete's submissions to show progress
  const submissions = await db.challengeSubmission.findMany({
    where: { athleteId: athlete.id },
    select: { challengeId: true, status: true, achievedRank: true },
  });

  const submissionMap = new Map(submissions.map(s => [s.challengeId, s]));

  // Grading type display
  const gradingTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    PASS_FAIL: { label: "Pass/Fail", icon: <Target className="w-3 h-3" /> },
    REPS: { label: "Reps", icon: <Dumbbell className="w-3 h-3" /> },
    TIME: { label: "Timed", icon: <Clock className="w-3 h-3" /> },
    DISTANCE: { label: "Distance", icon: <Target className="w-3 h-3" /> },
    TIMED_REPS: { label: "Timed Reps", icon: <Clock className="w-3 h-3" /> },
  };

  const ChallengeCard = ({ challenge }: { challenge: typeof myDisciplineChallenges[0] }) => {
    const submission = submissionMap.get(challenge.id);
    const grading = gradingTypeLabels[challenge.gradingType] || { label: challenge.gradingType, icon: null };

    return (
      <Link href={`/challenges/${challenge.slug}`} className="block group">
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
                  <Badge variant="secondary">Pending Review</Badge>
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
              {/* Grading type */}
              <Badge variant="outline" className="text-xs gap-1">
                {grading.icon}
                {grading.label}
              </Badge>

              {/* Disciplines */}
              {challenge.disciplines.slice(0, 2).map(cd => (
                <Badge key={cd.id} variant="secondary" className="text-xs">
                  {cd.discipline.icon} {cd.discipline.name}
                </Badge>
              ))}
              {challenge.disciplines.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{challenge.disciplines.length - 2}
                </Badge>
              )}
            </div>

            {/* Submission count */}
            <div className="mt-3 text-xs text-muted-foreground">
              {challenge._count.submissions} submission{challenge._count.submissions !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Challenges</h1>
        <p className="text-muted-foreground">
          Earn XP by completing challenges tailored to your training
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {submissions.filter(s => s.status === "APPROVED").length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {submissions.filter(s => s.status === "PENDING").length}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{myDisciplineChallenges.length}</div>
              <div className="text-xs text-muted-foreground">For You</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{athleteDisciplines.length}</div>
              <div className="text-xs text-muted-foreground">Disciplines</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={disciplineIds.length > 0 ? "my-disciplines" : "discover"} className="w-full">
        <TabsList className="mb-6">
          {disciplineIds.length > 0 && (
            <TabsTrigger value="my-disciplines">
              For You ({myDisciplineChallenges.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="discover">
            Discover {discoverChallenges.length > 0 && `(${discoverChallenges.length})`}
          </TabsTrigger>
          <TabsTrigger value="all">All Disciplines</TabsTrigger>
        </TabsList>

        {/* My Disciplines Tab */}
        {disciplineIds.length > 0 && (
          <TabsContent value="my-disciplines">
            {myDisciplineChallenges.length > 0 ? (
              <>
                {/* Show user's disciplines */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {athleteDisciplines.map(ad => (
                    <Badge key={ad.id} variant="secondary" className="text-sm">
                      {ad.discipline.icon} {ad.discipline.name}
                    </Badge>
                  ))}
                  <Link href="/profile/settings">
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      + Add Discipline
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {myDisciplineChallenges.map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Filter className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No challenges yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add disciplines to your profile to see personalized challenges
                  </p>
                  <Link href="/profile/settings">
                    <Button>Add Disciplines</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Discover Tab */}
        <TabsContent value="discover">
          {discoverChallenges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {discoverChallenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">You&apos;ve seen them all!</h3>
                <p className="text-muted-foreground">
                  All available challenges match your disciplines. Check the &quot;For You&quot; tab.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Disciplines Tab */}
        <TabsContent value="all">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allDisciplines.map(discipline => (
              <Link key={discipline.id} href={`/disciplines/${discipline.slug}`}>
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ 
                        backgroundColor: discipline.color 
                          ? `${discipline.color}20` 
                          : undefined 
                      }}
                    >
                      {discipline.icon || "🏋️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">{discipline.name}</h3>
                      {discipline.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {discipline.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="aspect-[4/3] bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    }>
      <ChallengesContent />
    </Suspense>
  );
}
