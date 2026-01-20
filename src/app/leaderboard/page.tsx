"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  RefreshCw,
  Loader2,
  Crown,
  Medal,
  Award,
  User,
} from "lucide-react";
import Link from "next/link";
import { formatLevel, getRankColor, Rank } from "@/lib/levels";

type LeaderboardTab = "all" | "mine";

interface LeaderboardAthlete {
  rank: number;
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  division: {
    id: string;
    name: string;
  } | null;
  primeLevel: {
    letter: Rank;
    sublevel: number;
    numericValue: number;
  };
  domainLevels: Array<{
    domain: string;
    domainName: string;
    letter: string;
    sublevel: number;
    numericValue: number;
  }>;
  totalXp: number;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  athletes: LeaderboardAthlete[];
  total: number;
  hasMore: boolean;
  currentUserRank: number | null;
  currentUserDivision: { id: string; name: string } | null;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("all");
  const [athletes, setAthletes] = useState<LeaderboardAthlete[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserDivision, setCurrentUserDivision] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(
    async (loadMore = false, isRefresh = false) => {
      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else if (loadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const currentOffset = loadMore ? offset : 0;
        const params = new URLSearchParams({
          division: activeTab,
          offset: currentOffset.toString(),
          limit: "50",
        });

        const res = await fetch(`/api/leaderboard?${params.toString()}`, {
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch leaderboard");
        }

        const data: LeaderboardResponse = await res.json();

        if (loadMore) {
          setAthletes((prev) => [...prev, ...data.athletes]);
          setOffset(currentOffset + data.athletes.length);
        } else {
          setAthletes(data.athletes);
          setOffset(data.athletes.length);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
        setCurrentUserRank(data.currentUserRank);
        setCurrentUserDivision(data.currentUserDivision);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, offset]
  );

  // Initial load and tab change
  useEffect(() => {
    setAthletes([]);
    setOffset(0);
    fetchLeaderboard(false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchLeaderboard(true, false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, isLoading, fetchLeaderboard]);

  // Refresh handler
  const handleRefresh = () => {
    setOffset(0);
    fetchLeaderboard(false, true);
  };

  // Get rank icon for top 3
  const RankIcon = ({ rank }: { rank: number }) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>;
  };

  // Athlete row component
  const AthleteRow = ({ athlete }: { athlete: LeaderboardAthlete }) => {
    const initials = athlete.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <Link
        href={athlete.username ? `/athletes/${athlete.username}` : "#"}
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
          athlete.isCurrentUser
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-muted/50"
        }`}
      >
        {/* Rank */}
        <div className="w-8 flex items-center justify-center">
          <RankIcon rank={athlete.rank} />
        </div>

        {/* Avatar */}
        <Avatar className="w-10 h-10">
          {athlete.avatarUrl ? (
            <AvatarImage src={athlete.avatarUrl} alt={athlete.displayName} />
          ) : null}
          <AvatarFallback>
            {initials || <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{athlete.displayName}</span>
            {athlete.isCurrentUser && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                You
              </span>
            )}
          </div>
          {athlete.division && (
            <p className="text-xs text-muted-foreground truncate">
              {athlete.division.name}
            </p>
          )}
        </div>

        {/* Prime Level */}
        <div
          className="flex items-center justify-center px-3 py-1.5 rounded-lg font-bold text-sm"
          style={{
            backgroundColor: `${getRankColor(athlete.primeLevel.letter)}20`,
            color: getRankColor(athlete.primeLevel.letter),
          }}
        >
          {formatLevel(athlete.primeLevel.letter, athlete.primeLevel.sublevel)}
        </div>
      </Link>
    );
  };

  // Loading skeleton
  const RowSkeleton = () => (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-8 h-5" />
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-24 h-3" />
      </div>
      <Skeleton className="w-12 h-8 rounded-lg" />
    </div>
  );

  // Empty state
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">No athletes yet</h3>
      <p className="text-muted-foreground text-sm max-w-xs">{message}</p>
    </div>
  );

  // Leaderboard list component
  const LeaderboardList = ({ emptyMessage }: { emptyMessage: string }) => {
    if (isLoading) {
      return (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchLeaderboard()}>
            Try again
          </Button>
        </div>
      );
    }

    if (athletes.length === 0) {
      return <EmptyState message={emptyMessage} />;
    }

    return (
      <div className="space-y-1">
        {athletes.map((athlete) => (
          <AthleteRow key={athlete.id} athlete={athlete} />
        ))}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
          {isLoadingMore && (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Leaderboard
          </h1>
          {total > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {total} athlete{total !== 1 ? "s" : ""} ranked
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Current user rank card */}
      {currentUserRank !== null && (
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-2xl font-bold">#{currentUserRank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {activeTab === "mine" ? "In your division" : "Overall"}
                </p>
                <p className="text-sm font-medium">out of {total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardTab)}>
        <TabsList className="w-full mb-6">
          <TabsTrigger value="all" className="flex-1 gap-1.5">
            <Trophy className="w-4 h-4" />
            All Athletes
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex-1 gap-1.5">
            <Medal className="w-4 h-4" />
            My Division
            {currentUserDivision && (
              <span className="hidden sm:inline text-xs text-muted-foreground ml-1">
                ({currentUserDivision.name.split(" ")[0]})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <LeaderboardList emptyMessage="No public athletes yet. Be the first to enable public profile and appear on the leaderboard!" />
        </TabsContent>

        <TabsContent value="mine">
          {!currentUserDivision ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Sign in required</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Sign in to see the leaderboard for your division.
              </p>
            </div>
          ) : (
            <LeaderboardList emptyMessage={`No public athletes in ${currentUserDivision.name} yet. Enable your public profile to be the first!`} />
          )}
        </TabsContent>
      </Tabs>

      {/* Opt-in notice */}
      <div className="mt-8 p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
        <p>
          Only athletes who have enabled &quot;Show me on the leaderboard&quot; appear here.
        </p>
        <Link href="/settings" className="text-primary hover:underline">
          Update your profile settings
        </Link>
      </div>
    </div>
  );
}
