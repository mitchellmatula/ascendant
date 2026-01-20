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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Loader2, ChevronDown } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface Athlete {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface JoinClassButtonProps {
  classId: string;
  className: string;
  requiresApproval: boolean;
  athletes: Athlete[]; // Athletes that can be enrolled
}

export function JoinClassButton({
  classId,
  className,
  requiresApproval,
  athletes,
}: JoinClassButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAthleteId, setLoadingAthleteId] = useState<string | null>(null);

  async function handleJoin(athleteId?: string) {
    setIsLoading(true);
    if (athleteId) setLoadingAthleteId(athleteId);
    
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to join class");
      }

      router.refresh();
    } catch (error) {
      console.error("Error joining class:", error);
      alert(error instanceof Error ? error.message : "Failed to join class");
    } finally {
      setIsLoading(false);
      setLoadingAthleteId(null);
    }
  }

  // Single athlete - simple button
  if (athletes.length === 1) {
    return (
      <Button
        onClick={() => handleJoin(athletes[0].id)}
        disabled={isLoading}
        className="w-full h-12"
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4 mr-2" />
        )}
        {requiresApproval ? `Request to Join${athletes[0].displayName ? ` (${athletes[0].displayName})` : ''}` : `Enroll ${athletes[0].displayName}`}
      </Button>
    );
  }

  // Multiple athletes - dropdown to select
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isLoading}
          className="w-full h-12"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4 mr-2" />
          )}
          {requiresApproval ? "Request to Join" : "Enroll a Child"}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        {athletes.map((athlete) => (
          <DropdownMenuItem
            key={athlete.id}
            onClick={() => handleJoin(athlete.id)}
            disabled={loadingAthleteId === athlete.id}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <Avatar className="w-6 h-6">
                <AvatarImage src={athlete.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {athlete.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1">{athlete.displayName}</span>
              {loadingAthleteId === athlete.id && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
