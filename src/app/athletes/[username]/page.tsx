import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAthleteFeed } from "@/lib/feed";
import { calculatePrime, formatLevel, getRankColor } from "@/lib/levels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedCard } from "@/components/feed/feed-card";
import { FollowButton } from "@/components/feed/follow-button";
import { Lock, MapPin, Trophy, Users } from "lucide-react";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  
  const athlete = await db.athlete.findUnique({
    where: { username },
    select: { displayName: true, showDisplayName: true },
  });

  if (!athlete) {
    return { title: "Athlete Not Found" };
  }

  // Only show real name in metadata if they've opted in
  const displayedName = athlete.showDisplayName ? athlete.displayName : `@${username}`;

  return {
    title: `${displayedName} | Ascendant`,
    description: `View ${displayedName}'s profile and achievements on Ascendant`,
  };
}

export default async function AthleteProfilePage({ params }: Props) {
  const { username } = await params;
  const { userId } = await auth();

  // Get athlete profile
  const athlete = await db.athlete.findUnique({
    where: { username },
    include: {
      domainLevels: {
        include: {
          domain: { select: { name: true, slug: true, color: true } },
        },
      },
      user: {
        include: {
          gymMemberships: {
            where: { isActive: true },
            include: {
              gym: { select: { name: true, slug: true } },
            },
            take: 3,
          },
        },
      },
      _count: {
        select: {
          followers: true,
          following: true,
          submissions: { where: { status: "APPROVED" } },
        },
      },
    },
  });

  if (!athlete) {
    notFound();
  }

  // Get current viewer's athlete ID
  let viewerId: string | null = null;
  let isOwner = false;
  let isFollowing = false;

  if (userId) {
    const viewer = await db.user.findUnique({
      where: { clerkId: userId },
      include: { athlete: { select: { id: true } } },
    });
    
    if (viewer?.athlete) {
      viewerId = viewer.athlete.id;
      isOwner = viewerId === athlete.id;

      if (!isOwner) {
        const follow = await db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: athlete.id,
            },
          },
        });
        isFollowing = !!follow;
      }
    }
  }

  // Determine what name to show
  // Show real name only if: owner viewing own profile, OR athlete has showDisplayName enabled
  const showRealName = isOwner || athlete.showDisplayName;
  const displayedName = showRealName ? athlete.displayName : `@${athlete.username}`;

  // Check visibility for non-owners
  const canViewFeed =
    isOwner ||
    athlete.feedVisibility === "PUBLIC" ||
    (athlete.feedVisibility === "FOLLOWERS" && isFollowing);

  // Get activity feed
  const feedResult = canViewFeed
    ? await getAthleteFeed(username, viewerId, { limit: 10 })
    : { items: [], isPrivate: true };

  // Calculate Prime level
  const primeLevel =
    athlete.domainLevels.length > 0
      ? calculatePrime(athlete.domainLevels)
      : { letter: "F", sublevel: 0 };

  // Get initials (from username if real name hidden)
  const getInitials = (name: string) =>
    name
      .replace("@", "")
      .split(/[\s_]/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Get gym memberships
  const gyms = athlete.user?.gymMemberships ?? [];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={athlete.avatarUrl || undefined} alt={displayedName} />
              <AvatarFallback className="text-2xl">{getInitials(displayedName)}</AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{displayedName}</h1>
                {/* Prime Badge */}
                <Badge
                  className="font-bold"
                  style={{
                    backgroundColor: `${getRankColor(primeLevel.letter)}20`,
                    color: getRankColor(primeLevel.letter),
                  }}
                >
                  ⭐ {formatLevel(primeLevel.letter, primeLevel.sublevel)}
                </Badge>
              </div>

              {/* Only show username line if real name is being displayed */}
              {showRealName && (
                <p className="text-muted-foreground mb-3">@{athlete.username}</p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {gyms.length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {gyms[0].gym.name}
                    {gyms.length > 1 && ` +${gyms.length - 1} more`}
                  </span>
                )}
              </div>
            </div>

            {/* Follow Button */}
            {!isOwner && viewerId && (
              <FollowButton
                username={athlete.username!}
                initialIsFollowing={isFollowing}
              />
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold">{athlete._count.submissions}</p>
              <p className="text-sm text-muted-foreground">Challenges</p>
            </div>
            <Link
              href={`/athletes/${athlete.username}/followers`}
              className="text-center hover:bg-muted/50 rounded-lg py-2 -my-2 transition-colors"
            >
              <p className="text-2xl font-bold">{athlete._count.followers}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </Link>
            <Link
              href={`/athletes/${athlete.username}/following`}
              className="text-center hover:bg-muted/50 rounded-lg py-2 -my-2 transition-colors"
            >
              <p className="text-2xl font-bold">{athlete._count.following}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Domain Levels */}
      {athlete.domainLevels.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Domain Ranks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {athlete.domainLevels.map((dl) => (
                <Link
                  key={dl.domainId}
                  href={`/domains/${dl.domain.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: dl.domain.color || "#6366f1" }}
                  >
                    {formatLevel(dl.letter, dl.sublevel)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{dl.domain.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {dl.currentXP.toLocaleString()} XP
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Recent Activity
        </h2>

        {feedResult.isPrivate ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">This profile is private</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                {athlete.feedVisibility === "FOLLOWERS"
                  ? "Follow this athlete to see their activity."
                  : "This athlete has set their profile to private."}
              </p>
            </CardContent>
          </Card>
        ) : feedResult.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No activity yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                {isOwner
                  ? "Complete some challenges to build your activity feed!"
                  : "This athlete hasn't completed any public challenges yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          feedResult.items.map((item) => <FeedCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
