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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

interface BreakthroughRule {
  id: string;
  domainId: string;
  divisionId: string | null;
  fromRank: string;
  toRank: string;
  tierRequired: string;
  challengeCount: number;
  isActive: boolean;
  domain: {
    name: string;
  };
  division?: {
    name: string;
  } | null;
}

interface BreakthroughActionsProps {
  rule: BreakthroughRule;
}

export function BreakthroughActions({ rule }: BreakthroughActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [tierRequired, setTierRequired] = useState(rule.tierRequired);
  const [challengeCount, setChallengeCount] = useState(rule.challengeCount.toString());

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/breakthroughs/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tierRequired,
          challengeCount: parseInt(challengeCount, 10),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update rule");
      }

      toast.success("Breakthrough rule updated");
      setIsEditOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update rule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/breakthroughs/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          isActive: !rule.isActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle rule");
      }

      toast.success(rule.isActive ? "Rule deactivated" : "Rule activated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle rule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/breakthroughs/${rule.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete rule");
      }

      toast.success("Breakthrough rule deleted");
      setIsDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete rule");
    } finally {
      setIsLoading(false);
    }
  };

  const tiers = ["F", "E", "D", "C", "B", "A", "S"];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActive}>
            {rule.isActive ? (
              <>
                <PowerOff className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Breakthrough Rule</DialogTitle>
            <DialogDescription>
              {rule.domain.name}: {rule.fromRank} → {rule.toRank}
              {rule.division && ` (${rule.division.name})`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tierRequired">Tier Required</Label>
              <Select value={tierRequired} onValueChange={setTierRequired}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier}-tier
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Athletes must achieve this tier or higher on challenges
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="challengeCount">Challenge Count</Label>
              <Input
                id="challengeCount"
                type="number"
                min="1"
                max="100"
                value={challengeCount}
                onChange={(e) => setChallengeCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Number of unique challenges required at the tier
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Breakthrough Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this breakthrough rule? 
              Athletes will be able to progress without meeting this requirement.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>{rule.domain.name}</strong>: {rule.fromRank} → {rule.toRank}
              {rule.division && ` (${rule.division.name})`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
