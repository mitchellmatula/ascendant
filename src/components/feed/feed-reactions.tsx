"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Emoji config matching the database enum
const REACTION_EMOJIS = [
  { emoji: "🔥", name: "Fire", key: "FIRE" },
  { emoji: "💪", name: "Strong", key: "STRONG" },
  { emoji: "👏", name: "Clap", key: "CLAP" },
  { emoji: "🎯", name: "Bullseye", key: "BULLSEYE" },
  { emoji: "⚡", name: "Lightning", key: "LIGHTNING" },
] as const;

interface FeedReactionsProps {
  submissionId: string;
  reactionCounts: Record<string, number>;
  userReactions?: string[];
  onToggle?: (emoji: string) => void;
}

export function FeedReactions({
  submissionId,
  reactionCounts,
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
    <div className="flex items-center gap-1">
      {REACTION_EMOJIS.map(({ emoji, name }) => {
        const count = localCounts[emoji] || 0;
        const isActive = localUserReactions.includes(emoji);

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
  );
}
