"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, MoreHorizontal, Trash2, RefreshCw, Check, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface InviteActionsProps {
  inviteId: string;
  inviteUrl: string;
  gymSlug: string;
  isActive: boolean;
  showReactivate?: boolean;
}

export function InviteActions({
  inviteId,
  inviteUrl,
  gymSlug,
  isActive,
  showReactivate = false,
}: InviteActionsProps) {
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRevoke = async () => {
    setIsLoading(true);
    try {
      await fetchWithAuth(`/api/gyms/${gymSlug}/invites/${inviteId}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to revoke invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      await fetchWithAuth(`/api/gyms/${gymSlug}/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to reactivate invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (showReactivate) {
    return (
      <Button variant="ghost" size="sm" onClick={handleReactivate}>
        <RefreshCw className="h-4 w-4 mr-1" />
        Reactivate
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {isActive && inviteUrl && (
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          {isCopied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isActive && inviteUrl && (
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
          )}
          {isActive && (
            <DropdownMenuItem
              onClick={handleRevoke}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Revoke Invite
            </DropdownMenuItem>
          )}
          {!isActive && (
            <DropdownMenuItem onClick={handleReactivate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
