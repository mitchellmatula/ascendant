"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, UserPlus, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatLevel, getRankColor } from "@/lib/levels";

interface AthleteOption {
  id: string;
  displayName: string;
  level?: { letter: string; sublevel: number } | null;
  isOwnProfile?: boolean;
}

interface AthleteSwitcherProps {
  athletes: AthleteOption[];
  activeAthleteId: string;
  showAddChild?: boolean;
}

export function AthleteSwitcher({
  athletes,
  activeAthleteId,
  showAddChild = false,
}: AthleteSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering dropdown after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeAthlete = athletes.find((a) => a.id === activeAthleteId);

  const handleSwitch = async (athleteId: string) => {
    if (athleteId === activeAthleteId) {
      setIsOpen(false);
      return;
    }

    try {
      const response = await fetch("/api/athletes/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId }),
      });

      if (response.ok) {
        setIsOpen(false);
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (error) {
      console.error("Failed to switch athlete:", error);
    }
  };

  // Don't show switcher if only one athlete and not showing add child
  if (athletes.length <= 1 && !showAddChild) {
    return null;
  }

  // Prevent hydration mismatch - render placeholder until mounted
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 h-9 px-3"
        disabled
      >
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[100px] truncate">
          {activeAthlete?.displayName ?? "Select Athlete"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9 px-3"
          disabled={isPending}
        >
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[100px] truncate">
            {activeAthlete?.displayName ?? "Select Athlete"}
          </span>
          {activeAthlete?.level && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${getRankColor(activeAthlete.level.letter)}20`,
                color: getRankColor(activeAthlete.level.letter),
              }}
            >
              {formatLevel(activeAthlete.level.letter, activeAthlete.level.sublevel)}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Viewing as
        </DropdownMenuLabel>
        
        {athletes.map((athlete) => (
          <DropdownMenuItem
            key={athlete.id}
            onClick={() => {
              if (athlete.id === activeAthleteId) {
                // If clicking the active athlete, go to ranks page
                setIsOpen(false);
                router.push("/domains");
              } else {
                handleSwitch(athlete.id);
              }
            }}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {athlete.isOwnProfile && (
                <span className="text-xs">🏃</span>
              )}
              <span className={athlete.id === activeAthleteId ? "font-medium" : ""}>
                {athlete.displayName}
              </span>
              {athlete.isOwnProfile && (
                <span className="text-xs text-muted-foreground">(me)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {athlete.level && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${getRankColor(athlete.level.letter)}20`,
                    color: getRankColor(athlete.level.letter),
                  }}
                >
                  {formatLevel(athlete.level.letter, athlete.level.sublevel)}
                </span>
              )}
              {athlete.id === activeAthleteId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}

        {showAddChild && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setIsOpen(false);
                router.push("/athletes/add");
              }}
              className="cursor-pointer"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Child
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
