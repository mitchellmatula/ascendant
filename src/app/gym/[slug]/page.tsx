import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { GymMembershipButton } from "./membership-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Globe, Phone, Mail, Users, Crown, Trophy, ChevronRight, Settings, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface GymPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GymPage({ params }: GymPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const gym = await db.gym.findUnique({
    where: { slug, isActive: true },
    include: {
      equipment: { include: { equipment: true } },
      disciplines: { include: { discipline: true } },
      members: {
        where: { 
          isActive: true,
          isPublicMember: true,
          user: {
            athlete: { isPublicProfile: true },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              athlete: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        take: 20,
      },
    },
  });

  if (!gym) notFound();

  let currentUserMembership: { isActive: boolean; isPublicMember: boolean; role: string } | null = null;
  if (user) {
    currentUserMembership = await db.gymMember.findUnique({
      where: {
        gymId_userId: {
          gymId: gym.id,
          userId: user.id,
        },
      },
    });
  }

  // Check if current user can manage members
  const isOwner = user && gym.ownerId === user.id;
  const isManager = currentUserMembership?.role === "MANAGER";
  const canManageMembers = isOwner || isManager;

  const totalMembers = await db.gymMember.count({
    where: { gymId: gym.id, isActive: true },
  });

  // Get discipline IDs for this gym
  const gymDisciplineIds = gym.disciplines.map(d => d.discipline.id);

  // Count gym-exclusive challenges (private to this gym)
  const exclusiveChallengeCount = await db.challenge.count({
    where: {
      isActive: true,
      gymId: gym.id,
    },
  });

  // Count public challenges matching gym's disciplines (gymId is null)
  const publicChallengeCount = gymDisciplineIds.length > 0 
    ? await db.challenge.count({
        where: {
          isActive: true,
          gymId: null,
          disciplines: {
            some: { disciplineId: { in: gymDisciplineIds } },
          },
        },
      })
    : 0;

  const totalChallengeCount = exclusiveChallengeCount + publicChallengeCount;

  // Get a few sample challenges (prioritize exclusive ones)
  const isMember = currentUserMembership?.isActive ?? false;
  
  // Get exclusive challenges first - show to everyone (teaser for non-members)
  const exclusiveChallenges = await db.challenge.findMany({
    where: {
      isActive: true,
      gymId: gym.id,
    },
    include: {
      primaryDomain: true,
      disciplines: { include: { discipline: true } },
    },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  // Fill remaining slots with public challenges
  const publicChallenges = gymDisciplineIds.length > 0 && (4 - exclusiveChallenges.length) > 0
    ? await db.challenge.findMany({
        where: {
          isActive: true,
          gymId: null,
          disciplines: {
            some: { disciplineId: { in: gymDisciplineIds } },
          },
        },
        include: {
          primaryDomain: true,
          disciplines: { include: { discipline: true } },
        },
        take: 4 - exclusiveChallenges.length,
        orderBy: { createdAt: "desc" },
      })
    : [];

  const sampleChallenges = [...exclusiveChallenges, ...publicChallenges];

  // Public members are those with isPublicMember=true AND isPublicProfile=true
  // This includes the owner if they've opted in
  const publicMembers = gym.members;
  const hiddenCount = totalMembers - publicMembers.length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Card className="mb-6">
        <CardHeader className="flex flex-col items-center gap-2 pb-2">
          {gym.logoUrl && (
            <Image
              src={gym.logoUrl}
              alt={gym.name + " logo"}
              width={96}
              height={96}
              className="rounded-lg border bg-white object-cover w-24 h-24"
              priority
            />
          )}
          <CardTitle className="text-2xl text-center">{gym.name}</CardTitle>
          {gym.address && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground text-center">
              <MapPin className="w-4 h-4" />
              {gym.address}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {gym.description && (
            <p className="text-center text-muted-foreground">{gym.description}</p>
          )}

          {gym.disciplines.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {gym.disciplines.map((d: typeof gym.disciplines[number]) => (
                <Badge key={d.discipline.id} variant="secondary" className="text-xs">
                  {d.discipline.icon} {d.discipline.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            {gym.website && (
              <a href={gym.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
            {gym.phone && (
              <a href={`tel:${gym.phone}`} className="flex items-center gap-1 hover:text-foreground">
                <Phone className="w-4 h-4" />
                {gym.phone}
              </a>
            )}
            {gym.email && (
              <a href={`mailto:${gym.email}`} className="flex items-center gap-1 hover:text-foreground">
                <Mail className="w-4 h-4" />
                Contact
              </a>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <GymMembershipButton
              gymSlug={gym.slug}
              isMember={currentUserMembership?.isActive ?? false}
              isPublicMember={currentUserMembership?.isPublicMember ?? false}
              isOwner={gym.ownerId === user?.id}
              isLoggedIn={!!user}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Community
            </CardTitle>
            {canManageMembers && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/gym/${slug}/members`}>
                  <Settings className="w-4 h-4 mr-1" />
                  Manage
                </Link>
              </Button>
            )}
          </div>
          <CardDescription>
            {totalMembers} member{totalMembers !== 1 ? "s" : ""}
            {hiddenCount > 0 && (
              <span className="text-muted-foreground/60"> · {hiddenCount} private</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publicMembers.length > 0 ? (
            <div className="space-y-2">
              {publicMembers.map((member) => {
                const isOwnerMember = member.userId === gym.ownerId;
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className={isOwnerMember ? "w-10 h-10" : "w-8 h-8"}>
                      {member.user.athlete?.avatarUrl && (
                        <AvatarImage src={member.user.athlete.avatarUrl} />
                      )}
                      <AvatarFallback>
                        {isOwnerMember ? (
                          <Crown className="w-4 h-4" />
                        ) : (
                          (member.user.athlete?.displayName || "A")[0].toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`${isOwnerMember ? "font-medium" : "text-sm"} truncate`}>
                        {member.user.athlete?.displayName || "Athlete"}
                      </span>
                      {isOwnerMember && (
                        <Badge variant="default" className="text-xs shrink-0">
                          <Crown className="w-3 h-3 mr-1" />
                          Owner
                        </Badge>
                      )}
                      {!isOwnerMember && member.role !== "MEMBER" && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {member.role.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No public members yet. Members can choose to appear here.
            </p>
          )}
        </CardContent>
      </Card>

      {gym.equipment.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gym.equipment.map((e: typeof gym.equipment[number]) => (
                <Badge key={e.equipment.id} variant="outline" className="text-xs">
                  {e.equipment.icon} {e.equipment.name}
                  {e.quantity > 1 && <span className="ml-1 opacity-70">×{e.quantity}</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Challenges Section */}
      {(totalChallengeCount > 0 || exclusiveChallengeCount > 0) && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Challenges
            </CardTitle>
            <CardDescription>
              {totalChallengeCount} challenge{totalChallengeCount !== 1 ? "s" : ""} available
              {exclusiveChallengeCount > 0 && (
                <span className="text-amber-600"> · {exclusiveChallengeCount} exclusive</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isMember && exclusiveChallengeCount > 0 && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Join this gym to attempt exclusive challenges</span>
              </div>
            )}
            
            <div className="space-y-3">
              {sampleChallenges.map((challenge) => {
                const isExclusive = challenge.gymId === gym.id;
                return (
                  <Link
                    key={challenge.id}
                    href={`/challenges/${challenge.slug}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: challenge.primaryDomain?.color ? `${challenge.primaryDomain.color}20` : undefined }}
                    >
                      {challenge.primaryDomain?.icon || "🎯"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{challenge.name}</p>
                        {isExclusive && (
                          <Badge variant="secondary" className="text-xs shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Lock className="w-3 h-3 mr-1" />
                            Exclusive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{challenge.primaryDomain?.name}</span>
                        {challenge.disciplines.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{challenge.disciplines[0].discipline.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>

            {totalChallengeCount > sampleChallenges.length && isMember && (
              <Link
                href={`/challenges?gym=${gym.slug}`}
                className="flex items-center justify-center gap-2 mt-4 py-2 text-sm text-primary hover:underline"
              >
                View all {totalChallengeCount} challenges
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
