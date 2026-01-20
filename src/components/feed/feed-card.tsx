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
  Flame,
  MapPin,
  UserPlus,
  UserMinus,
  Loader2,
  MoreVertical,
  EyeOff,
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

  // Get tier color
  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      F: "bg-gray-500",
      E: "bg-green-500",
      D: "bg-blue-500",
      C: "bg-purple-500",
      B: "bg-orange-500",
      A: "bg-red-500",
      S: "bg-yellow-500",
    };
    return colors[tier] || "bg-gray-500";
  };

  // Varied achievement phrases based on tier
  const getAchievementPhrase = (tier: string | null | undefined, submissionId: string) => {
    // Use submission ID to get consistent but varied phrase per submission
    const phrases = tier && ["S"].includes(tier)
      ? [ // Legendary phrases for S-tier
          "Absolutely legendary",
          "Peak performance",
          "Untouchable",
          "God-tier execution",
          "Maximum effort",
          "Historic achievement",
          "Beyond limits",
          "Transcendent",
        ]
      : tier && ["A"].includes(tier)
      ? [ // Elite phrases for A-tier
          "Elite showing",
          "Incredible performance",
          "Exceptional work",
          "Outstanding execution",
          "Top-tier effort",
          "Impressive display",
          "Remarkable achievement",
          "Masterful",
        ]
      : tier && ["B"].includes(tier)
      ? [ // Strong phrases for B-tier
          "Crushed it",
          "Dominated",
          "Excellent work",
          "Strong performance",
          "Brought the heat",
          "Serious gains",
          "Powerful showing",
          "Beast mode",
        ]
      : tier && ["C"].includes(tier)
      ? [ // Good phrases for C-tier
          "Nailed it",
          "Solid performance",
          "Great effort",
          "Well executed",
          "Clean work",
          "Delivered",
          "On point",
          "Steady progress",
        ]
      : tier && ["D"].includes(tier)
      ? [ // Decent phrases for D-tier
          "Got it done",
          "Good work",
          "Respectable showing",
          "Building momentum",
          "Making moves",
          "Putting in reps",
          "Consistent effort",
          "Grinding",
        ]
      : tier && ["E"].includes(tier)
      ? [ // Encouraging phrases for E-tier
          "On the board",
          "Getting started",
          "First steps",
          "Building foundation",
          "Learning the ropes",
          "In the game",
          "Starting strong",
          "Early gains",
        ]
      : [ // Default phrases for F-tier or no tier (pass/fail)
          "Challenge complete",
          "Checked it off",
          "Another one down",
          "Did the thing",
          "Mission accomplished",
          "In the books",
          "Logged it",
          "Rep counted",
        ];
    
    // Use a hash of submission ID to pick phrase consistently
    const hash = submissionId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return phrases[hash % phrases.length];
  };

  // Build achievement story sentence
  const buildAchievementStory = (submission: NonNullable<FeedItem["submission"]>) => {
    const parts: string[] = [];
    
    // Value achieved (e.g., "25 reps", "22:33", "100m")
    if (submission.achievedValue != null && submission.achievedValue > 0) {
      if (submission.gradingType === "TIME") {
        // Use proper time formatting based on magnitude
        // If over an hour, use hh:mm:ss, otherwise mm:ss
        const format = submission.achievedValue >= 3600 ? "hh:mm:ss" : "mm:ss";
        parts.push(formatSecondsToTime(submission.achievedValue, format));
      } else if (submission.gradingUnit) {
        parts.push(`${submission.achievedValue} ${submission.gradingUnit}`);
      }
    }
    
    // XP earned
    if (submission.xpAwarded > 0) {
      parts.push(`+${submission.xpAwarded} XP`);
    }
    
    if (parts.length === 0) return null;
    
    // Build the sentence with varied phrase
    const phrase = getAchievementPhrase(submission.achievedTier, submission.id);
    return `${phrase} with ${parts.join(" • ")}!`;
  };
  
  // Build rank up summary if level up occurred
  const buildRankUpSummary = (levelUp: NonNullable<FeedItem["submission"]>["levelUp"]) => {
    if (!levelUp) return null;
    
    // Calculate how many sublevels gained
    const oldTotal = "FEDCBAS".indexOf(levelUp.oldLetter) * 10 + levelUp.oldSublevel;
    const newTotal = "FEDCBAS".indexOf(levelUp.newLetter) * 10 + levelUp.newSublevel;
    const sublevelsGained = newTotal - oldTotal;
    
    // Check if it was a letter rank change
    const letterChanged = levelUp.oldLetter !== levelUp.newLetter;
    
    if (letterChanged) {
      return `Ranked up to ${levelUp.newLetter}-rank in ${levelUp.domainName}!`;
    } else if (sublevelsGained > 1) {
      return `Gained ${sublevelsGained} levels in ${levelUp.domainName}!`;
    }
    return null; // Single sublevel gain shown in the level up callout
  };

  if (item.type === "submission" && item.submission) {
    const { submission, athlete } = item;
    const achievementStory = buildAchievementStory(submission);
    const rankUpSummary = buildRankUpSummary(submission.levelUp);
    
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
                    @{athlete.username}
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
                className="shrink-0"
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

        {/* Challenge Name & Achievement Story */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Link 
              href={`/challenges/${submission.challengeSlug}`}
              className="font-semibold text-lg hover:text-accent transition-colors"
            >
              {submission.challengeName}
            </Link>
            {/* Tier Badge */}
            {submission.achievedTier && (
              <Badge className={cn("text-white", getTierColor(submission.achievedTier))}>
                🏆 {submission.achievedTier}-Tier
              </Badge>
            )}
          </div>
          
          {/* Achievement Story (value + XP) */}
          {achievementStory && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
              {achievementStory}
            </p>
          )}
          
          {/* Rank Up Summary (if letter rank changed or multiple levels gained) */}
          {rankUpSummary && (
            <p className="text-sm font-medium text-yellow-500 flex items-center gap-1.5 mt-1">
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              {rankUpSummary}
            </p>
          )}
          
          {/* User Notes */}
          {submission.notes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              "{submission.notes}"
            </p>
          )}
        </div>

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
                  @{athlete.username}
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
