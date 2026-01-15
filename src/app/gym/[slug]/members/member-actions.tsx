"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Shield, UserCheck, Users, UserX } from "lucide-react";

type GymRole = "MEMBER" | "COACH" | "MANAGER" | "OWNER";

interface MemberActionsProps {
  memberId: string;
  memberName: string;
  currentRole: GymRole;
  gymSlug: string;
  isOwner: boolean; // Whether current user is the gym owner
}

const roleOptions: { role: GymRole; label: string; icon: typeof Shield }[] = [
  { role: "MANAGER", label: "Manager", icon: Shield },
  { role: "COACH", label: "Coach", icon: UserCheck },
  { role: "MEMBER", label: "Member", icon: Users },
];

export function MemberActions({ 
  memberId, 
  memberName, 
  currentRole, 
  gymSlug,
  isOwner,
}: MemberActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (newRole: GymRole) => {
    setError(null);
    
    startTransition(async () => {
      try {
        const response = await fetch(`/api/gyms/${gymSlug}/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to update role");
          return;
        }

        router.refresh();
      } catch {
        setError("Failed to update role");
      }
    });
  };

  const handleRemove = async () => {
    setError(null);
    
    startTransition(async () => {
      try {
        const response = await fetch(`/api/gyms/${gymSlug}/members/${memberId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to remove member");
          return;
        }

        setShowRemoveDialog(false);
        router.refresh();
      } catch {
        setError("Failed to remove member");
      }
    });
  };

  // Only owners can change roles to Manager, managers can only demote
  const availableRoles = roleOptions.filter(opt => {
    if (opt.role === currentRole) return false;
    // Managers can't promote to Manager
    if (!isOwner && opt.role === "MANAGER") return false;
    return true;
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="w-4 h-4" />
            <span className="sr-only">Member actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableRoles.length > 0 && (
            <>
              <DropdownMenuLabel>Change Role</DropdownMenuLabel>
              {availableRoles.map(({ role, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  disabled={isPending}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  Make {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => setShowRemoveDialog(true)}
            disabled={isPending}
            className="text-destructive focus:text-destructive"
          >
            <UserX className="w-4 h-4 mr-2" />
            Remove from gym
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberName}</strong> from this gym?
              They can rejoin later if the gym allows it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
