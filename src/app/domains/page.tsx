import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLevel, getRankColor, getRankLabel, calculatePrime } from "@/lib/levels";
import { Badge } from "@/components/ui/badge";

export default async function DomainsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding
  const hasProfile = user.athlete || user.managedAthletes.length > 0;
  if (!hasProfile) {
    redirect("/onboarding");
  }

  // Get the active athlete
  const athlete = user.athlete ?? user.managedAthletes[0];

  // Get domain levels for the athlete
  const domainLevels = await db.domainLevel.findMany({
    where: { athleteId: athlete.id },
    include: { domain: true },
  });

  // Get all domains with category counts
  const allDomains = await db.domain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        where: { isActive: true },
        select: { id: true },
      },
      _count: {
        select: {
          primaryChallenges: { where: { isActive: true } },
        },
      },
    },
  });

  // Calculate Prime
  const prime = calculatePrime(domainLevels);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">My Rankings</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Track your progress across all four domains
        </p>
      </div>

      {/* Prime Level Summary */}
      <Card className="mb-6 md:mb-8 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="text-2xl md:text-3xl">⭐</div>
              <div>
                <div className="text-sm text-muted-foreground">Prime Level</div>
                <div
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: getRankColor(prime.letter) }}
                >
                  {formatLevel(prime.letter, prime.sublevel)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Rank</div>
              <div className="text-lg md:text-xl font-medium">{getRankLabel(prime.letter)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {allDomains.map((domain) => {
          const level = domainLevels.find((l) => l.domainId === domain.id);
          const letter = level?.letter ?? "F";
          const sublevel = level?.sublevel ?? 0;
          const currentXP = level?.currentXP ?? 0;
          const categoryCount = domain.categories.length;
          const challengeCount = domain._count.primaryChallenges;

          return (
            <Link key={domain.id} href={`/domains/${domain.slug}`}>
              <Card 
                className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full"
                style={{ borderLeftColor: domain.color ?? undefined, borderLeftWidth: domain.color ? 4 : undefined }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl md:text-3xl">{domain.icon ?? "🎯"}</span>
                      <div>
                        <CardTitle className="text-lg md:text-xl">{domain.name}</CardTitle>
                        <CardDescription className="text-xs md:text-sm line-clamp-1">
                          {domain.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                    <div
                      className="text-2xl md:text-3xl font-bold"
                      style={{ color: domain.color ?? getRankColor(letter) }}
                    >
                      {formatLevel(letter, sublevel)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* XP Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{currentXP.toLocaleString()} XP</span>
                      <span>{getRankLabel(letter)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ 
                          width: `${Math.min(((currentXP % 100) / 100) * 100, 100)}%`,
                          backgroundColor: domain.color ?? "hsl(var(--primary))",
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {categoryCount} {categoryCount === 1 ? "category" : "categories"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {challengeCount} {challengeCount === 1 ? "challenge" : "challenges"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {allDomains.length === 0 && (
        <Card className="text-center py-8 md:py-12">
          <CardContent>
            <p className="text-muted-foreground">
              No domains have been configured yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back soon for challenges to complete!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
