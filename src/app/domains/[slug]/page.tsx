import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLevel, getRankColor, getRankLabel, type Rank } from "@/lib/levels";
import { ChevronLeft, ChevronRight, CheckCircle, Trophy } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DomainDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  const { slug } = await params;
  const athlete = await getActiveAthlete(user);
  if (!athlete) {
    redirect("/onboarding");
  }

  // Get domain with categories
  const domain = await db.domain.findUnique({
    where: { slug, isActive: true },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: {
              challenges: { where: { challenge: { isActive: true } } },
            },
          },
        },
      },
    },
  });

  if (!domain) {
    notFound();
  }

  // Get athlete's level in this domain
  const domainLevel = await db.domainLevel.findUnique({
    where: {
      athleteId_domainId: {
        athleteId: athlete.id,
        domainId: domain.id,
      },
    },
  });

  const letter = domainLevel?.letter ?? "F";
  const sublevel = domainLevel?.sublevel ?? 0;
  const currentXP = domainLevel?.currentXP ?? 0;

  // Get challenge counts by category with completion status
  const challengesByCategoryRaw = await db.challenge.findMany({
    where: {
      isActive: true,
      primaryDomainId: domain.id,
    },
    select: {
      id: true,
      categories: {
        select: { categoryId: true },
      },
    },
  });

  // Get athlete's completed challenges
  const completedSubmissions = await db.challengeSubmission.findMany({
    where: {
      athleteId: athlete.id,
      status: "APPROVED",
    },
    select: { challengeId: true },
  });

  const completedChallengeIds = new Set(completedSubmissions.map(s => s.challengeId));

  // Get a few featured challenges from this domain
  const featuredChallenges = await db.challenge.findMany({
    where: {
      isActive: true,
      primaryDomainId: domain.id,
      gymId: null, // Only global challenges
    },
    include: {
      submissions: {
        where: { athleteId: athlete.id },
        select: { status: true, achievedRank: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // Sort: incomplete first, then by name
  const sortedFeaturedChallenges = featuredChallenges.sort((a, b) => {
    const aCompleted = a.submissions.some(s => s.status === "APPROVED");
    const bCompleted = b.submissions.some(s => s.status === "APPROVED");
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
    return a.name.localeCompare(b.name);
  }).slice(0, 4);

  // Calculate completion per category
  const categoryStats = domain.categories.map(category => {
    const categoryChalllenges = challengesByCategoryRaw.filter(c => 
      c.categories.some(cat => cat.categoryId === category.id)
    );
    const total = categoryChalllenges.length;
    const completed = categoryChalllenges.filter(c => completedChallengeIds.has(c.id)).length;
    return {
      ...category,
      totalChallenges: total,
      completedChallenges: completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Back button */}
      <Link 
        href="/dashboard" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Dashboard
      </Link>

      {/* Domain Header */}
      <Card 
        className="mb-6 md:mb-8"
        style={{ borderLeftColor: domain.color ?? undefined, borderLeftWidth: domain.color ? 4 : undefined }}
      >
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl md:text-4xl">{domain.icon ?? "🎯"}</span>
              <div>
                <CardTitle className="text-xl md:text-2xl">{domain.name}</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  {domain.description || "Master challenges in this domain to level up"}
                </CardDescription>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div
                className="text-3xl md:text-4xl font-bold"
                style={{ color: domain.color ?? getRankColor(letter) }}
              >
                {formatLevel(letter, sublevel)}
              </div>
              <div className="text-sm text-muted-foreground">{getRankLabel(letter)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {currentXP.toLocaleString()} XP
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* XP Progress Bar */}
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ 
                width: `${Math.min(((currentXP % 100) / 100) * 100, 100)}%`,
                backgroundColor: domain.color ?? "hsl(var(--primary))",
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Featured Challenges */}
      {sortedFeaturedChallenges.length > 0 && (
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: domain.color ?? undefined }} />
              Challenges
            </h2>
            <Link href={`/challenges?domain=${domain.slug}`}>
              <Button variant="ghost" size="sm" className="text-sm">
                View all
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedFeaturedChallenges.map((challenge) => {
              const submission = challenge.submissions[0];
              const isCompleted = submission?.status === "APPROVED";
              const achievedRank = submission?.achievedRank as Rank | null;
              
              return (
                <Link key={challenge.id} href={`/challenges/${challenge.slug}`}>
                  <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                            style={{ backgroundColor: achievedRank ? getRankColor(achievedRank) : "#22c55e" }}
                          >
                            {achievedRank || <CheckCircle className="w-5 h-5" />}
                          </div>
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ 
                              backgroundColor: domain.color ? `${domain.color}20` : "hsl(var(--muted))",
                              color: domain.color ?? undefined,
                            }}
                          >
                            <Trophy className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isCompleted ? "text-muted-foreground" : ""}`}>
                            {challenge.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isCompleted ? (
                              <span className="text-green-600 dark:text-green-400">
                                ✓ Completed{achievedRank ? ` • ${achievedRank}-Tier` : ""}
                              </span>
                            ) : (
                              "Not completed"
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="mb-4">
        <h2 className="text-lg md:text-xl font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          {categoryStats.length} {categoryStats.length === 1 ? "category" : "categories"} • 
          {" "}{challengesByCategoryRaw.length} total challenges
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryStats.map((category) => (
          <Link key={category.id} href={`/domains/${domain.slug}/${category.slug}`}>
            <Card className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{category.icon ?? "📁"}</span>
                    <CardTitle className="text-base md:text-lg">{category.name}</CardTitle>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                {category.description && (
                  <CardDescription className="text-xs md:text-sm line-clamp-2">
                    {category.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {/* Progress */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{category.completedChallenges} / {category.totalChallenges} completed</span>
                    <span>{category.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${category.progress}%` }}
                    />
                  </div>
                </div>

                <Badge variant="outline" className="text-xs">
                  {category.totalChallenges} {category.totalChallenges === 1 ? "challenge" : "challenges"}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {categoryStats.length === 0 && (
        <Card className="text-center py-8 md:py-12">
          <CardContent>
            <p className="text-muted-foreground">
              No categories have been added to this domain yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back soon for new challenges!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
