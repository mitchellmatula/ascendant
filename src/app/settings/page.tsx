import { redirect } from "next/navigation";
import { getCurrentUser, getActiveAthlete } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "./profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { findMatchingDivision } from "@/lib/divisions";
import { formatLevel, getRankColor, calculatePrime } from "@/lib/levels";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get the active athlete
  const activeAthlete = await getActiveAthlete(user);

  if (!activeAthlete) {
    redirect("/onboarding");
  }

  // Fetch full athlete data with disciplines
  const athlete = await db.athlete.findUnique({
    where: { id: activeAthlete.id },
    include: {
      disciplines: {
        include: {
          discipline: true,
        },
      },
      domainLevels: {
        include: {
          domain: true,
        },
      },
    },
  });

  if (!athlete) {
    redirect("/onboarding");
  }

  // Get all disciplines for the picker
  const disciplines = await db.discipline.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // Get division info
  const division = await findMatchingDivision(athlete.dateOfBirth, athlete.gender);

  // Calculate Prime level
  const prime = athlete.domainLevels.length > 0 
    ? calculatePrime(athlete.domainLevels) 
    : { letter: "F", sublevel: 0 };

  const isOwnProfile = athlete.id === user.athlete?.id;

  return (
    <div className="space-y-6">
      {/* Profile Form */}
      <ProfileForm 
        athlete={athlete} 
        disciplines={disciplines}
        isOwnProfile={isOwnProfile}
      />

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Stats & Division</CardTitle>
          <CardDescription>Your current standing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prime Level */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Prime Level</span>
            <span 
              className="font-bold text-lg px-3 py-1 rounded-full"
              style={{
                backgroundColor: `${getRankColor(prime.letter)}20`,
                color: getRankColor(prime.letter),
              }}
            >
              {formatLevel(prime.letter, prime.sublevel)}
            </span>
          </div>

          {/* Division */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Division</span>
            <span className="font-medium">
              {division?.name ?? "Unassigned"}
            </span>
          </div>

          {/* Domain Levels */}
          {athlete.domainLevels.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Domain Levels</p>
              <div className="grid grid-cols-2 gap-2">
                {athlete.domainLevels.map((dl) => (
                  <div 
                    key={dl.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted"
                  >
                    <span className="text-sm">{dl.domain.name}</span>
                    <span 
                      className="font-bold text-sm"
                      style={{ color: getRankColor(dl.letter) }}
                    >
                      {formatLevel(dl.letter, dl.sublevel)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <Link 
              href="/dashboard" 
              className="text-sm text-primary hover:underline"
            >
              View detailed progress →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your Ascendant account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Account Type</span>
            <span className="font-medium capitalize">
              {user.accountType.toLowerCase()}
            </span>
          </div>
          {user.managedAthletes.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Managed Athletes</span>
              <Link 
                href="/settings/children" 
                className="text-sm text-primary hover:underline"
              >
                {user.managedAthletes.length} child{user.managedAthletes.length !== 1 ? "ren" : ""}
              </Link>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connected Apps</span>
            <Link 
              href="/settings/connections" 
              className="text-sm text-primary hover:underline"
            >
              Strava, Garmin →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
