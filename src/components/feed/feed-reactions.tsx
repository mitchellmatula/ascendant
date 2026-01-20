"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Emoji config matching the database enum
const REACTION_EMOJIS = [
  { emoji: "🔥", name: "Fire", key: "FIRE" },
  { emoji: "💪", name: "Strong", key: "STRONG" },
  { emoji: "👏", name: "Clap", key: "CLAP" },
  { emoji: "🎯", name: "Bullseye", key: "BULLSEYE" },
  { emoji: "⚡", name: "Lightning", key: "LIGHTNING" },
] as const;

interface Reactor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface FeedReactionsProps {
  submissionId: string;
  reactionCounts: Record<string, number>;
  reactors?: Record<string, Reactor[]>;
  userReactions?: string[];
  onToggle?: (emoji: string) => void;
}

// Rotating reactor display component
function ReactorTicker({ reactors }: { reactors: Record<string, Reactor[]> }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  // Flatten all reactors with their emoji
  const allReactions = useMemo(() => {
    const reactions: Array<{ emoji: string; reactor: Reactor }> = [];
    for (const [emoji, users] of Object.entries(reactors)) {
      for (const reactor of users) {
        reactions.push({ emoji, reactor });
      }
    }
    return reactions;
  }, [reactors]);
  
  useEffect(() => {
    if (allReactions.length <= 1) return;
    
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      
      // After fade out, change to next and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % allReactions.length);
        setIsVisible(true);
      }, 300);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [allReactions.length]);
  
  if (allReactions.length === 0) return null;
  
  const current = allReactions[currentIndex];
  if (!current) return null;
  
  return (
    <Link
      href={`/athletes/${current.reactor.username}`}
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 min-w-0",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
      )}
    >
      <span className="text-xs">{current.emoji}</span>
      <span className="truncate max-w-[120px] font-medium">
        {current.reactor.username}
      </span>
    </Link>
  );
}

export function FeedReactions({
  submissionId,
  reactionCounts,
  reactors = {},
  userReactions = [],
  onToggle,
}: FeedReactionsProps) {
  const [localCounts, setLocalCounts] = useState(reactionCounts);
  const [localUserReactions, setLocalUserReactions] = useState(userReactions);
  const [isPending, startTransition] = useTransition();

  const handleReaction = async (emoji: string) => {
    const isActive = localUserReactions.includes(emoji);
    
    // Optimistic update
    setLocalUserReactions((prev) =>
      isActive ? prev.filter((e) => e !== emoji) : [...prev, emoji]
    );
    setLocalCounts((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + (isActive ? -1 : 1),
    }));

    // Call parent handler if provided
    onToggle?.(emoji);

    // Actually send to API
    startTransition(async () => {
      try {
        const method = isActive ? "DELETE" : "POST";
        const url = isActive
          ? `/api/submissions/${submissionId}/reactions?emoji=${encodeURIComponent(emoji)}`
          : `/api/submissions/${submissionId}/reactions`;
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          ...(method === "POST" ? { body: JSON.stringify({ emoji }) } : {}),
        });

        if (!res.ok) {
          // Revert on error
          setLocalUserReactions((prev) =>
            isActive ? [...prev, emoji] : prev.filter((e) => e !== emoji)
          );
          setLocalCounts((prev) => ({
            ...prev,
            [emoji]: (prev[emoji] || 0) + (isActive ? 1 : -1),
          }));
        }
      } catch (error) {
        // Revert on error
        setLocalUserReactions((prev) =>
          isActive ? [...prev, emoji] : prev.filter((e) => e !== emoji)
        );
        setLocalCounts((prev) => ({
          ...prev,
          [emoji]: (prev[emoji] || 0) + (isActive ? 1 : -1),
        }));
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {REACTION_EMOJIS.map(({ emoji, name }) => {
          const count = localCounts[emoji] || 0;
          const isActive = localUserReactions.includes(emoji);
          const emojiReactors = reactors[emoji] || [];

          // If there are reactors, wrap in a Popover
          if (count > 0 && emojiReactors.length > 0) {
            return (
              <Popover key={emoji}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    className={cn(
                      "h-8 px-2 gap-1 text-muted-foreground hover:text-foreground",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <span 
                      className="text-base cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation();
                      handleReaction(emoji);
                    }}
                  >
                    {emoji}
                  </span>
                  <span className="text-xs tabular-nums">{count}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-56 p-2" 
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground px-1 pb-1 border-b">
                    {name}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {emojiReactors.map((reactor) => (
                      <Link
                        key={reactor.id}
                        href={`/athletes/${reactor.username}`}
                        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={reactor.avatarUrl || undefined} alt={reactor.displayName} />
                          <AvatarFallback className="text-[10px]">
                            {reactor.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{reactor.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">@{reactor.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        }

        // No reactors yet, just show button
        return (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            onClick={() => handleReaction(emoji)}
            disabled={isPending}
            title={name}
            className={cn(
              "h-8 px-2 gap-1 text-muted-foreground hover:text-foreground",
              isActive && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <span className="text-base">{emoji}</span>
            {count > 0 && (
              <span className="text-xs tabular-nums">{count}</span>
            )}
          </Button>
        );
      })}
      </div>
      
      {/* Rotating reactor ticker */}
      <ReactorTicker reactors={reactors} />
    </div>
  );
}
