"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MessageCircle, 
  Play, 
  TrendingUp,
  Trophy,
  MapPin,
  UserPlus,
  UserMinus,
  Loader2,
  MoreVertical,
  EyeOff,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSecondsToTime } from "@/lib/time";
import { FeedReactions } from "./feed-reactions";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { FeedItem } from "@/lib/feed";

// Dynamically import map to avoid SSR issues with Leaflet
const StravaRouteMap = dynamic(
  () => import("@/components/strava/strava-route-map").then((m) => m.StravaRouteMap),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> }
);

interface FeedCardProps {
  item: FeedItem;
  currentAthleteId?: string;
  isAdmin?: boolean;
  onReactionToggle?: (emoji: string) => void;
  onHide?: (submissionId: string) => void;
}

export function FeedCard({ item, currentAthleteId, isAdmin, onReactionToggle, onHide }: FeedCardProps) {
  const router = useRouter();
  const [showVideo, setShowVideo] = useState(false);
  const [isFollowing, setIsFollowing] = useState(item.athlete.isFollowing ?? false);
  const [followPending, setFollowPending] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  // Handle hide from feed (admin only)
  const handleHideFromFeed = async (submissionId: string) => {
    setIsHiding(true);
    try {
      const res = await fetchWithAuth(`/api/feed/${submissionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onHide?.(submissionId);
        router.refresh();
      }
    } finally {
      setIsHiding(false);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    const newState = !isFollowing;
    setIsFollowing(newState);
    setFollowPending(true);
    
    try {
      const method = newState ? "POST" : "DELETE";
      const res = await fetch(`/api/athletes/${item.athlete.username}/follow`, { 
        method, 
        credentials: "include" 
      });
      if (!res.ok) {
        setIsFollowing(!newState); // Revert on error
      }
    } catch {
      setIsFollowing(!newState); // Revert on error
    } finally {
      setFollowPending(false);
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format rank badge
  const formatRank = (letter: string, sublevel: number) => `${letter}${sublevel}`;

  // Render exciting rank up banner
  const renderRankUpBanner = (levelUp: NonNullable<FeedItem["submission"]>["levelUp"]) => {
    if (!levelUp) return null;
    
    const oldTotal = "FEDCBAS".indexOf(levelUp.oldLetter) * 10 + levelUp.oldSublevel;
    const newTotal = "FEDCBAS".indexOf(levelUp.newLetter) * 10 + levelUp.newSublevel;
    const sublevelsGained = newTotal - oldTotal;
    const letterChanged = levelUp.oldLetter !== levelUp.newLetter;
    
    // Only show banner for significant gains (letter change or 2+ sublevels)
    if (!letterChanged && sublevelsGained < 2) return null;
    
    // Get domain color (subtle backgrounds)
    const domainColors: Record<string, { bg: string; text: string; glow: string }> = {
      Strength: { bg: "from-red-600/10 to-orange-600/10", text: "text-red-400", glow: "shadow-red-500/20" },
      Skill: { bg: "from-purple-600/10 to-pink-600/10", text: "text-purple-400", glow: "shadow-purple-500/20" },
      Endurance: { bg: "from-green-600/10 to-emerald-600/10", text: "text-green-400", glow: "shadow-green-500/20" },
      Speed: { bg: "from-yellow-600/10 to-amber-600/10", text: "text-yellow-400", glow: "shadow-yellow-500/20" },
    };
    const colors = domainColors[levelUp.domainName] || { bg: "from-blue-600/10 to-cyan-600/10", text: "text-blue-400", glow: "shadow-blue-500/20" };
    
    return (
      <Link 
        href={`/domains/${levelUp.domainSlug}`}
        className={cn(
          "block mx-4 mb-3 p-3 rounded-xl border border-white/10",
          "bg-gradient-to-r",
          colors.bg,
          "hover:scale-[1.02] transition-transform cursor-pointer"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Domain Icon/Name */}
            <div className="flex flex-col items-start">
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", colors.text)}>
                {levelUp.domainName}
              </span>
              {/* Level Transition */}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-muted-foreground">
                  {levelUp.oldLetter}{levelUp.oldSublevel}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                <span className={cn("text-xl font-bold", colors.text)}>
                  {levelUp.newLetter}{levelUp.newSublevel}
                </span>
              </div>
            </div>
          </div>
          
          {/* RANK UP / LEVEL UP Badge */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <Zap className={cn("w-4 h-4", colors.text)} />
              <span className={cn(
                "text-sm font-black uppercase tracking-wide",
                letterChanged ? "text-yellow-400" : colors.text
              )}>
                {letterChanged ? "RANK UP!" : "LEVEL UP!"}
              </span>
            </div>
            {sublevelsGained > 1 && (
              <span className="text-[10px] text-muted-foreground">
                +{sublevelsGained} rank
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  };

  if (item.type === "submission" && item.submission) {
    const { submission, athlete } = item;
    
    // Don't show follow button for own posts
    const showFollowButton = currentAthleteId && currentAthleteId !== athlete.id;

    return (
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <Link 
              href={`/athletes/${athlete.username}`}
              className="flex items-center gap-3 group"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={athlete.avatarUrl || undefined} alt={athlete.displayName} />
                <AvatarFallback>{getInitials(athlete.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium group-hover:text-accent transition-colors">
                    {athlete.username}
                  </span>
                  {athlete.primeLevel && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {formatRank(athlete.primeLevel.letter, athlete.primeLevel.sublevel)}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>
            </Link>
            {showFollowButton && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={handleFollowToggle}
                disabled={followPending}
                className="shrink-0 ml-auto"
              >
                {followPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleHideFromFeed(submission.id)}
                    disabled={isHiding}
                    className="text-destructive focus:text-destructive"
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    {isHiding ? "Hiding..." : "Hide from feed"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Challenge Name & Stats */}
        <div className="px-4 pb-3">
          <Link 
            href={`/challenges/${submission.challengeSlug}`}
            className="font-semibold text-lg hover:text-accent transition-colors block"
          >
            {submission.challengeName}
          </Link>
          
          {/* Stats Row - Plain text */}
          <p className="text-sm text-muted-foreground mt-1">
            {/* Value + Tier */}
            {submission.achievedValue != null && submission.achievedValue > 0 && (
              <>
                <span className="font-semibold text-foreground">
                  {submission.gradingType === "TIME" 
                    ? formatSecondsToTime(submission.achievedValue, submission.achievedValue >= 3600 ? "hh:mm:ss" : "mm:ss")
                    : `${submission.achievedValue} ${submission.gradingUnit || ""}`}
                </span>
                {submission.achievedTier && ` (${submission.achievedTier}-Tier)`}
              </>
            )}
            {/* Just tier if no value (pass/fail) */}
            {(submission.achievedValue == null || submission.achievedValue === 0) && submission.achievedTier && (
              <>{submission.achievedTier}-Tier</>
            )}
            {/* XP */}
            {submission.xpAwarded > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {(submission.achievedValue != null && submission.achievedValue > 0) || submission.achievedTier ? " • " : ""}
                +{submission.xpAwarded} XP
              </span>
            )}
          </p>
          
          {/* User Notes */}
          {submission.notes && (
            <p className="text-sm mt-2 line-clamp-3">
              {submission.notes}
            </p>
          )}
        </div>

        {/* Rank Up Banner - Game Style! */}
        {renderRankUpBanner(submission.levelUp)}

        {/* Route Map for Strava activities with polyline */}
        {submission.activityPolyline && (
          <div className="px-4 pb-3">
            <div className="rounded-lg overflow-hidden border">
              <StravaRouteMap
                polyline={submission.activityPolyline}
                height={180}
                interactive={false}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              {submission.activityType && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{submission.activityType}</span>
                </div>
              )}
              {submission.stravaActivityUrl && (
                <a
                  href={submission.stravaActivityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#FC4C02] hover:underline"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  View on Strava
                </a>
              )}
            </div>
          </div>
        )}

        {/* Video/Image Thumbnail */}
        {(submission.videoUrl || submission.imageUrl) && (
          <div className="relative aspect-video bg-muted">
            {showVideo && submission.videoUrl ? (
              <video
                src={submission.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <button
                onClick={() => submission.videoUrl && setShowVideo(true)}
                className="w-full h-full relative group"
              >
                {submission.imageUrl ? (
                  <Image
                    src={submission.imageUrl}
                    alt={submission.challengeName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Trophy className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}
                
                {submission.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                    </div>
                  </div>
                )}
              </button>
            )}
          </div>
        )}

        {/* Reactions & Comments */}
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <FeedReactions
              submissionId={submission.id}
              reactionCounts={submission.reactionCounts}
              reactors={submission.reactors}
              userReactions={submission.userReactions}
              onToggle={onReactionToggle}
            />
            
            <Link href={`/submissions/${submission.id}#comments`}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <MessageCircle className="w-4 h-4" />
                {submission.commentCount > 0 && (
                  <span>{submission.commentCount}</span>
                )}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Level up standalone (if we add this later)
  if (item.type === "level_up" && item.levelUp) {
    const { levelUp, athlete } = item;

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Link href={`/athletes/${athlete.username}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={athlete.avatarUrl || undefined} alt={athlete.displayName} />
                <AvatarFallback>{getInitials(athlete.displayName)}</AvatarFallback>
              </Avatar>
            </Link>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link 
                  href={`/athletes/${athlete.username}`}
                  className="font-medium hover:text-primary transition-colors"
                >
                  {athlete.username}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
                <span className="text-sm">
                  Leveled up in{" "}
                  <Link 
                    href={`/domains/${levelUp.domainSlug}`}
                    className="font-medium hover:text-primary"
                  >
                    {levelUp.domainName}
                  </Link>
                  :{" "}
                  <span className="text-muted-foreground">
                    {levelUp.oldLetter}{levelUp.oldSublevel}
                  </span>
                  {" → "}
                  <span className="text-yellow-500 font-semibold">
                    {levelUp.newLetter}{levelUp.newSublevel}
                  </span>
                  {levelUp.xpGained > 0 && (
                    <span className="text-green-500 ml-2">+{levelUp.xpGained} XP</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
