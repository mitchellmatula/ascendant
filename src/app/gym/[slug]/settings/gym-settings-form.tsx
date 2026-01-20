"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Trash2, AlertTriangle, GraduationCap } from "lucide-react";
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
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface GymSettingsFormProps {
  gym: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  };
  classes: {
    id: string;
    name: string;
  }[];
}

export function GymSettingsForm({ gym, classes }: GymSettingsFormProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(gym.isActive);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleVisibilityChange = async (visible: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetchWithAuth(`/api/gyms/${gym.slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: visible }),
      });

      if (res.ok) {
        setIsActive(visible);
        router.refresh();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteGym = async () => {
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/gyms/${gym.slug}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard?gymDeleted=true");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const res = await fetchWithAuth(`/api/classes/${classId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            Gym Visibility
          </CardTitle>
          <CardDescription>
            Control whether your gym is visible to the public
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="visibility">Public Visibility</Label>
              <p className="text-sm text-muted-foreground">
                {isActive 
                  ? "Your gym is visible to everyone" 
                  : "Your gym is hidden from public view"}
              </p>
            </div>
            <Switch
              id="visibility"
              checked={isActive}
              onCheckedChange={handleVisibilityChange}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Classes Management */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Classes
            </CardTitle>
            <CardDescription>
              {classes.length} active class{classes.length !== 1 ? "es" : ""} at this gym
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {classes.map((classItem) => (
                <div 
                  key={classItem.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <span className="font-medium">{classItem.name}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Class</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{classItem.name}&quot;? 
                          This will remove all members and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteClass(classItem.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Class
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your gym
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Gym</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this gym, all members, and {classes.length} class{classes.length !== 1 ? "es" : ""}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Gym
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {gym.name}?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <span className="block">
                        This will permanently delete:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Your gym profile and all settings</li>
                        <li>All {classes.length} class{classes.length !== 1 ? "es" : ""} and their members</li>
                        <li>All gym-exclusive challenges</li>
                        <li>All member associations</li>
                      </ul>
                      <span className="block font-medium">
                        Type &quot;{gym.name}&quot; to confirm:
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={gym.name}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteGym}
                      disabled={deleteConfirmText !== gym.name || isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete Forever"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
