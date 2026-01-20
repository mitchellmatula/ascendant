import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FollowButton } from "@/components/feed/follow-button";
import { ChevronLeft, UserPlus } from "lucide-react";
import { calculatePrime, formatLevel, getRankColor } from "@/lib/levels";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  
  const athlete = await db.athlete.findUnique({
    where: { username },
    select: { displayName: true },
  });

  if (!athlete) {
    return { title: "Athlete Not Found" };
  }

  return {
    title: `People ${athlete.displayName} follows | Ascendant`,
    description: `View who ${athlete.displayName} follows on Ascendant`,
  };
}

export default async function FollowingPage({ params }: Props) {
  const { username } = await params;
  const { userId } = await auth();

  // Get athlete with following
  const athlete = await db.athlete.findUnique({
    where: { username },
    select: {
      id: true,
      displayName: true,
      username: true,
      following: {
        include: {
          following: {
            include: {
              domainLevels: {
                include: { domain: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!athlete) {
    notFound();
  }

  // Get current viewer's athlete and who they follow
  let viewerId: string | null = null;
  let followingIds = new Set<string>();

  if (userId) {
    const viewer = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        athlete: {
          select: {
            id: true,
            following: { select: { followingId: true } },
          },
        },
      },
    });
    
    if (viewer?.athlete) {
      viewerId = viewer.athlete.id;
      followingIds = new Set(viewer.athlete.following.map(f => f.followingId));
    }
  }

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href={`/athletes/${username}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {athlete.displayName}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Following ({athlete.following.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {athlete.following.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Not following anyone yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {athlete.following.map(({ following: followedAthlete }) => {
                const primeLevel = followedAthlete.domainLevels.length > 0
                  ? calculatePrime(followedAthlete.domainLevels)
                  : { letter: "F", sublevel: 0 };
                const isOwnProfile = viewerId === followedAthlete.id;
                const isFollowing = followingIds.has(followedAthlete.id);

                return (
                  <div key={followedAthlete.id} className="flex items-center gap-3 py-3">
                    <Link href={`/athletes/${followedAthlete.username}`} className="shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={followedAthlete.avatarUrl || undefined} alt={followedAthlete.displayName} />
                        <AvatarFallback>{getInitials(followedAthlete.displayName)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <Link href={`/athletes/${followedAthlete.username}`} className="hover:text-accent">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{followedAthlete.displayName}</span>
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs px-1.5 py-0"
                            style={{
                              backgroundColor: `${getRankColor(primeLevel.letter)}20`,
                              color: getRankColor(primeLevel.letter),
                            }}
                          >
                            {formatLevel(primeLevel.letter, primeLevel.sublevel)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">@{followedAthlete.username}</p>
                      </Link>
                    </div>

                    {!isOwnProfile && viewerId && (
                      <FollowButton
                        username={followedAthlete.username!}
                        initialIsFollowing={isFollowing}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
