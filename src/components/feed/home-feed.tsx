"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedCard } from "@/components/feed/feed-card";
import { 
  Globe, 
  Users, 
  Building2, 
  Trophy,
  RefreshCw,
  Loader2,
  Search,
} from "lucide-react";
import type { FeedItem } from "@/lib/feed";

type FeedTab = "community" | "following" | "gym";

interface FeedResponse {
  items: FeedItem[];
  nextCursor?: string;
}

interface HomeFeedProps {
  isSignedIn: boolean;
  currentAthleteId?: string;
}

export function HomeFeed({ isSignedIn, currentAthleteId }: HomeFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>("community");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch feed data
  const fetchFeed = useCallback(async (cursor?: string, isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({ tab: activeTab });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/feed?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch feed");
      }

      const data: FeedResponse = await res.json();

      if (cursor && !isRefresh) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  // Initial load and tab change
  useEffect(() => {
    setItems([]);
    setNextCursor(undefined);
    fetchFeed();
  }, [activeTab, fetchFeed]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore && !isLoading) {
          fetchFeed(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [nextCursor, isLoadingMore, isLoading, fetchFeed]);

  // Pull to refresh handler
  const handleRefresh = () => {
    setNextCursor(undefined);
    fetchFeed(undefined, true);
  };

  // Tab content for auth-required tabs
  const AuthRequiredContent = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">Sign in required</h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        Sign in to see posts from people you follow, your gym members, and athletes in your division.
      </p>
    </div>
  );

  // Empty state
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
      <p className="text-muted-foreground text-sm max-w-xs">{message}</p>
    </div>
  );

  // Feed list component
  const FeedList = ({ emptyMessage }: { emptyMessage: string }) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchFeed()}>
            Try again
          </Button>
        </div>
      );
    }

    if (items.length === 0) {
      return <EmptyState message={emptyMessage} />;
    }

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} currentAthleteId={currentAthleteId} />
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
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Activity Feed</h2>
        <div className="flex items-center gap-2">
          <Link href="/athletes/search">
            <Button variant="ghost" size="icon" title="Find athletes">
              <Search className="w-5 h-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="community" className="flex-1 gap-1.5">
            <Globe className="w-4 h-4 hidden sm:block" />
            Community
          </TabsTrigger>
          <TabsTrigger value="following" className="flex-1 gap-1.5">
            <Users className="w-4 h-4 hidden sm:block" />
            Following
          </TabsTrigger>
          <TabsTrigger value="gym" className="flex-1 gap-1.5">
            <Building2 className="w-4 h-4 hidden sm:block" />
            Gym
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community">
          <FeedList emptyMessage="No public challenge completions yet. Be the first to complete a challenge and share it!" />
        </TabsContent>

        <TabsContent value="following">
          {!isSignedIn ? (
            <AuthRequiredContent />
          ) : (
            <FeedList emptyMessage="No posts from people you follow. Start following athletes to see their achievements here!" />
          )}
        </TabsContent>

        <TabsContent value="gym">
          {!isSignedIn ? (
            <AuthRequiredContent />
          ) : (
            <FeedList emptyMessage="No posts from your gym members yet. Join a gym to see activity from fellow athletes!" />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

// Skeleton for loading state
function FeedCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-32 h-3" />
        </div>
      </div>
      
      {/* Challenge name */}
      <Skeleton className="w-48 h-5" />
      
      {/* Video thumbnail */}
      <Skeleton className="w-full aspect-video rounded-lg" />
      
      {/* Reactions */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="w-12 h-8 rounded-md" />
        ))}
      </div>
    </div>
  );
}
