"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface Domain {
  id: string;
  name: string;
  _count: {
    categories: number;
  };
}

interface DomainActionsProps {
  domain: Domain;
}

export function DomainActions({ domain }: DomainActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (force = false) => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const url = force
        ? `/api/admin/domains/${domain.id}?force=true`
        : `/api/admin/domains/${domain.id}`;

      const response = await fetch(url, { method: "DELETE", credentials: "include" });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.details) {
          // Has related data, show warning
          setDeleteError(
            `This domain has ${data.details.categories} categories and ${data.details.athleteLevels} athlete levels. Deleting it will remove all related data.`
          );
          setIsDeleting(false);
          return;
        }
        throw new Error(data.error || "Failed to delete");
      }

      setShowDeleteDialog(false);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
            <span className="text-xl">⋮</span>
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/domains/${domain.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/categories?domain=${domain.id}`}>
              Manage Categories
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{domain.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                "This action cannot be undone. This will permanently delete the domain and all associated data."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            {deleteError ? (
              <AlertDialogAction
                onClick={() => handleDelete(true)}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Anyway"}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={() => handleDelete(false)}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
