import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLevel, getRankColor, getRankLabel, calculatePrime } from "@/lib/levels";

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

  // Get the active athlete (either the user's own profile or first managed athlete)
  const athlete = user.athlete ?? user.managedAthletes[0];

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

  // Calculate Prime
  const prime = calculatePrime(domainLevels);

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

          return (
            <Card key={domain.id} className="hover:shadow-lg transition-shadow">
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
                  {currentXP.toLocaleString()} XP
                </div>
                {/* Progress bar within sublevel */}
                <div className="mt-1.5 md:mt-2 h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((currentXP % 100) / 100) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
}
