import { redirect } from "next/navigation";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLevel, getRankColor, getRankLabel, calculatePrime, type Rank } from "@/lib/levels";
import { XP_PER_SUBLEVEL, CUMULATIVE_XP_TO_RANK } from "@/lib/xp-constants";
import Link from "next/link";
import { Building2 } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding
  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  // Get the active athlete (respects switcher selection)
  const athlete = await getActiveAthlete(user);
  if (!athlete) {
    redirect("/onboarding");
  }

  // Get domain levels for the athlete
  const domainLevels = await db.domainLevel.findMany({
    where: { athleteId: athlete.id },
    include: { domain: true },
  });

  // Get all domains to show empty ones too
  const allDomains = await db.domain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // Get recent XP transactions
  const recentActivity = await db.xPTransaction.findMany({
    where: { athleteId: athlete.id },
    include: { domain: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Get recent submissions
  const recentSubmissions = await db.challengeSubmission.findMany({
    where: { athleteId: athlete.id },
    include: { 
      challenge: {
        include: {
          primaryDomain: true,
        }
      } 
    },
    orderBy: { submittedAt: "desc" },
    take: 5,
  });

  // Get user's gym memberships
  const gymMemberships = await db.gymMember.findMany({
    where: { userId: user.id, isActive: true },
    include: {
      gym: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  // Calculate Prime
  const prime = calculatePrime(domainLevels);

  // Helper function to calculate progress within current sublevel
  const calculateProgress = (letter: string, sublevel: number, currentXP: number) => {
    const rank = letter as Rank;
    const xpPerSublevel = XP_PER_SUBLEVEL[rank] || 100;
    const baseXP = CUMULATIVE_XP_TO_RANK[rank] || 0;
    const xpForCurrentSublevel = sublevel * xpPerSublevel;
    const xpIntoSublevel = currentXP - baseXP - xpForCurrentSublevel;
    const progress = Math.min(100, Math.max(0, (xpIntoSublevel / xpPerSublevel) * 100));
    const xpToNext = xpPerSublevel - xpIntoSublevel;
    return { progress, xpToNext, xpPerSublevel };
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {athlete.displayName}!</h1>
        <p className="text-muted-foreground text-sm md:text-base">Track your progress across all domains</p>
      </div>

      {/* Prime Level */}
      <Card className="mb-6 md:mb-8 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <span className="text-xl md:text-2xl">⭐</span>
            Prime Level
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Your overall athletic balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className="text-4xl md:text-5xl font-bold"
              style={{ color: getRankColor(prime.letter) }}
            >
              {formatLevel(prime.letter, prime.sublevel)}
            </div>
            <div>
              <div className="text-base md:text-lg font-medium">{getRankLabel(prime.letter)}</div>
              <div className="text-xs md:text-sm text-muted-foreground">
                Average of all domains
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Cards - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {allDomains.map((domain) => {
          const level = domainLevels.find((l) => l.domainId === domain.id);
          const letter = level?.letter ?? "F";
          const sublevel = level?.sublevel ?? 0;
          const currentXP = level?.currentXP ?? 0;
          const { progress, xpToNext, xpPerSublevel } = calculateProgress(letter, sublevel, currentXP);

          return (
            <Link href={`/domains/${domain.slug}`} key={domain.id}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
                  <CardTitle className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                    <span className="text-lg md:text-xl">{domain.icon ?? "🎯"}</span>
                    <span className="truncate">{domain.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                  <div
                    className="text-3xl md:text-4xl font-bold mb-1 md:mb-2"
                    style={{ color: domain.color ?? getRankColor(letter) }}
                  >
                    {formatLevel(letter, sublevel)}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    {getRankLabel(letter)}
                  </div>
                  <div className="mt-1.5 md:mt-2 text-xs text-muted-foreground">
                    {currentXP.toLocaleString()} XP total
                  </div>
                  {/* Progress bar within sublevel */}
                  <div className="mt-1.5 md:mt-2">
                    <div className="h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ 
                          width: `${progress}%`,
                          backgroundColor: domain.color ?? getRankColor(letter)
                        }}
                      />
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                      {xpToNext.toLocaleString()} XP to next level
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Empty state if no domains configured */}
      {allDomains.length === 0 && (
        <Card className="text-center py-8 md:py-12">
          <CardContent>
            <p className="text-muted-foreground">
              No domains have been configured yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              An administrator needs to set up domains, categories, and challenges.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6 md:mt-8">
        {/* Recent Submissions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Recent Submissions</CardTitle>
            <CardDescription className="text-xs md:text-sm">Your latest challenge attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No submissions yet</p>
                <Link 
                  href="/challenges" 
                  className="text-primary text-sm hover:underline mt-2 inline-block"
                >
                  Browse challenges →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{submission.challenge.primaryDomain?.icon ?? "🎯"}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{submission.challenge.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                      submission.status === "APPROVED" 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : submission.status === "REJECTED"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : submission.status === "NEEDS_REVISION"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {submission.status === "NEEDS_REVISION" ? "Revision" : submission.status.charAt(0) + submission.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
                <Link 
                  href="/submissions" 
                  className="text-primary text-sm hover:underline block text-center pt-2"
                >
                  View all submissions →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* XP Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">XP Activity</CardTitle>
            <CardDescription className="text-xs md:text-sm">Recent experience gained</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No XP earned yet</p>
                <p className="text-xs text-muted-foreground mt-1">Complete challenges to earn XP!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{activity.domain.icon ?? "🎯"}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{activity.domain.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.note || activity.source.toLowerCase().replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400 shrink-0">
                      +{activity.amount} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Gyms Section */}
      {gymMemberships.length > 0 && (
        <Card className="mt-6 md:mt-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              My Gyms
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Gyms you&apos;ve joined</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {gymMemberships.map((membership) => (
                <Link
                  key={membership.gym.id}
                  href={`/gym/${membership.gym.slug}`}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  {membership.gym.logoUrl ? (
                    <img
                      src={membership.gym.logoUrl}
                      alt={membership.gym.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{membership.gym.name}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mt-6 md:mt-8">
        <CardContent className="py-4 md:py-6">
          <div className="flex flex-wrap gap-3 justify-center">
            <Link 
              href="/challenges"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              🎯 Browse Challenges
            </Link>
            <Link 
              href="/domains"
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              📊 View Domains
            </Link>
            <Link 
              href="/submissions"
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              📝 My Submissions
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
