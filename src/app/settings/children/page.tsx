import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLevel, getRankColor, calculatePrime } from "@/lib/levels";
import { UserPlus, ChevronRight } from "lucide-react";

export default async function ChildrenSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get managed athletes with their levels (any user can manage children)
  const managedAthletes = await db.athlete.findMany({
    where: {
      parentId: user.id,
    },
    include: {
      domainLevels: true,
      disciplines: {
        include: {
          discipline: true,
        },
      },
    },
    orderBy: {
      displayName: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Managed Children</CardTitle>
            <CardDescription>
              Athletes you manage as a parent
            </CardDescription>
          </div>
          <Link href="/athletes/add">
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Child
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {managedAthletes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven't added any children yet
              </p>
              <Link href="/athletes/add">
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Child
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {managedAthletes.map((athlete) => {
                const prime = athlete.domainLevels.length > 0
                  ? calculatePrime(athlete.domainLevels)
                  : { letter: "F", sublevel: 0 };
                
                const age = Math.floor(
                  (Date.now() - new Date(athlete.dateOfBirth).getTime()) / 
                  (365.25 * 24 * 60 * 60 * 1000)
                );

                return (
                  <Link
                    key={athlete.id}
                    href={`/settings/children/${athlete.id}`}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={athlete.avatarUrl ?? undefined} />
                      <AvatarFallback>
                        {athlete.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {athlete.displayName}
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${getRankColor(prime.letter)}20`,
                            color: getRankColor(prime.letter),
                          }}
                        >
                          {formatLevel(prime.letter, prime.sublevel)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {age} years old • {athlete.gender}
                      </div>
                      {athlete.disciplines.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {athlete.disciplines.map(d => d.discipline.name).join(", ")}
                        </div>
                      )}
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parent's own profile link (if they also compete) */}
      {user.athlete && (
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              You're also registered as an athlete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings"
              className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.athlete.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {user.athlete.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="font-medium">{user.athlete.displayName}</div>
                <div className="text-sm text-muted-foreground">Your athlete profile</div>
              </div>
              
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
