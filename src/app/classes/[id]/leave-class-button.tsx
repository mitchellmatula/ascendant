"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, MoreVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MemberAthlete {
  id: string;
  displayName: string;
}

interface LeaveClassButtonProps {
  classId: string;
  className: string;
  memberAthletes: MemberAthlete[];
  isParent: boolean;
}

export function LeaveClassButton({
  classId,
  className,
  memberAthletes,
  isParent,
}: LeaveClassButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<MemberAthlete | null>(null);

  const handleLeave = async (athlete: MemberAthlete) => {
    setIsLoading(athlete.id);
    try {
      const res = await fetchWithAuth(
        `/api/classes/${classId}/members?athleteId=${athlete.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to leave class");
      }

      toast.success(
        isParent
          ? `${athlete.displayName} has left ${className}`
          : `You have left ${className}`
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave class");
    } finally {
      setIsLoading(null);
      setDialogOpen(false);
      setSelectedAthlete(null);
    }
  };

  const openConfirmDialog = (athlete: MemberAthlete) => {
    setSelectedAthlete(athlete);
    setDialogOpen(true);
  };

  // Single athlete - simple dropdown with leave option
  if (memberAthletes.length === 1) {
    const athlete = memberAthletes[0];
    return (
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Class options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  openConfirmDialog(athlete);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Leave Class
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {className}?</AlertDialogTitle>
            <AlertDialogDescription>
              {isParent
                ? `Are you sure you want to remove ${athlete.displayName} from this class? They can rejoin later if needed.`
                : "Are you sure you want to leave this class? You can rejoin later if needed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleLeave(athlete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === athlete.id}
            >
              {isLoading === athlete.id && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Leave Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Multiple athletes (parent with multiple enrolled children)
  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Class options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {memberAthletes.map((athlete) => (
            <DropdownMenuItem
              key={athlete.id}
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                openConfirmDialog(athlete);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Remove {athlete.displayName}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from {className}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {selectedAthlete?.displayName} from
            this class? They can rejoin later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => selectedAthlete && handleLeave(selectedAthlete)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isLoading !== null}
          >
            {isLoading !== null && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
