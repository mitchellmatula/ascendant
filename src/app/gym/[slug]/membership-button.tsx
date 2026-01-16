"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus, UserMinus, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface GymMembershipButtonProps {
  gymSlug: string;
  isMember: boolean;
  isPublicMember: boolean;
  isOwner: boolean;
  isLoggedIn: boolean;
}

export function GymMembershipButton({
  gymSlug,
  isMember,
  isPublicMember,
  isOwner,
  isLoggedIn,
}: GymMembershipButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [publicMember, setPublicMember] = useState(isPublicMember);

  const handleJoin = async () => {
    startTransition(async () => {
      const res = await fetch(`/api/gyms/${gymSlug}/membership`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        router.refresh();
      }
    });
  };

  const handleLeave = async () => {
    startTransition(async () => {
      const res = await fetch(`/api/gyms/${gymSlug}/membership`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        router.refresh();
      }
    });
  };

  const handleTogglePublic = async (checked: boolean) => {
    setPublicMember(checked);
    startTransition(async () => {
      const res = await fetch(`/api/gyms/${gymSlug}/membership`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublicMember: checked }),
      });
      if (!res.ok) {
        setPublicMember(!checked); // revert on error
      }
      router.refresh();
    });
  };

  // Not logged in - show sign in prompt
  if (!isLoggedIn) {
    return (
      <Button variant="outline" asChild>
        <Link href="/sign-in">
          <LogIn className="w-4 h-4 mr-2" />
          Sign in to join
        </Link>
      </Button>
    );
  }

  // Owner - show visibility toggle (owners are also members)
  if (isOwner) {
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm text-muted-foreground">You own this gym</span>
        <div className="flex items-center gap-3">
          <Switch
            id="public-member"
            checked={publicMember}
            onCheckedChange={handleTogglePublic}
            disabled={isPending}
          />
          <Label htmlFor="public-member" className="text-sm flex items-center gap-2 cursor-pointer">
            {publicMember ? (
              <>
                <Eye className="w-4 h-4" />
                Show me as owner
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                Hidden from public
              </>
            )}
          </Label>
        </div>
      </div>
    );
  }

  // Already a member - show leave + visibility toggle
  if (isMember) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Switch
            id="public-member"
            checked={publicMember}
            onCheckedChange={handleTogglePublic}
            disabled={isPending}
          />
          <Label htmlFor="public-member" className="text-sm flex items-center gap-2 cursor-pointer">
            {publicMember ? (
              <>
                <Eye className="w-4 h-4" />
                Visible on gym page
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                Hidden from gym page
              </>
            )}
          </Label>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4 mr-2" />
              )}
              Leave gym
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave this gym?</AlertDialogTitle>
              <AlertDialogDescription>
                You can rejoin at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Not a member - show join button
  return (
    <Button onClick={handleJoin} disabled={isPending}>
      {isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4 mr-2" />
      )}
      Join this gym
    </Button>
  );
}
