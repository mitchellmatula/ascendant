"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface ProgressLinkProps {
  athlete: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  challengeSlug: string;
  activeAthleteId: string | null;
  grade?: {
    achievedTier: string | null;
    passed: boolean | null;
  } | null;
}

export function ProgressLink({ 
  athlete, 
  challengeSlug, 
  activeAthleteId,
  grade 
}: ProgressLinkProps) {
  const router = useRouter();

  const handleClick = async () => {
    const needsSwitch = activeAthleteId !== athlete.id;
    
    if (needsSwitch) {
      // Switch athlete first
      const res = await fetchWithAuth("/api/athletes/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.id }),
      });

      if (res.ok) {
        toast.success(`Switched to ${athlete.displayName}`);
      } else {
        toast.error("Failed to switch athlete");
        return;
      }
    }

    // Navigate to challenge
    router.push(`/challenges/${challengeSlug}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-between text-sm w-full hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded transition-colors"
    >
      <div className="flex items-center gap-2">
        <Avatar className="w-5 h-5">
          <AvatarImage src={athlete.avatarUrl || undefined} />
          <AvatarFallback className="text-[8px]">
            {athlete.displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground hover:text-foreground transition-colors">
          {athlete.displayName}
        </span>
      </div>
      <div>
        {grade ? (
          <>
            {grade.achievedTier && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                {grade.achievedTier}-tier
              </Badge>
            )}
            {grade.passed !== null && !grade.achievedTier && (
              <Badge variant={grade.passed ? "default" : "destructive"}>
                {grade.passed ? "Pass" : "Fail"}
              </Badge>
            )}
          </>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Not graded
          </Badge>
        )}
      </div>
    </button>
  );
}
