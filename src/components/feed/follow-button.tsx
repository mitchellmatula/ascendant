"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface FollowButtonProps {
  username: string;
  initialIsFollowing: boolean;
}

export function FollowButton({ username, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newState = !isFollowing;
    
    // Optimistic update
    setIsFollowing(newState);

    startTransition(async () => {
      try {
        const method = newState ? "POST" : "DELETE";
        const res = await fetch(`/api/athletes/${username}/follow`, { method, credentials: "include" });

        if (!res.ok) {
          // Revert on error
          setIsFollowing(!newState);
        }
      } catch {
        // Revert on error
        setIsFollowing(!newState);
      }
    });
  };

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      onClick={handleToggle}
      disabled={isPending}
      className="min-w-[100px]"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-4 h-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
}
