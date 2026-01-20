"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { ArrowLeft, Loader2, Save, Trash2, Archive } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  requiresApproval: boolean;
  isActive: boolean;
  gym: { name: string } | null;
  memberCount: number;
  benchmarkCount: number;
}

export default function ClassSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [classData, setClassData] = useState<ClassData | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);

  useEffect(() => {
    async function loadClass() {
      try {
        const res = await fetchWithAuth(`/api/classes/${classId}`);
        if (!res.ok) throw new Error("Failed to load class");
        const data = await res.json();
        setClassData(data);
        setName(data.name);
        setDescription(data.description || "");
        setIsPublic(data.isPublic);
        setRequiresApproval(data.requiresApproval);
      } catch (error) {
        console.error("Error loading class:", error);
      } finally {
        setLoading(false);
      }
    }
    loadClass();
  }, [classId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          isPublic,
          requiresApproval,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      router.push(`/coach/classes/${classId}`);
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const res = await fetchWithAuth(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to archive");
      }

      router.push("/coach");
    } catch (error) {
      console.error("Archive error:", error);
      alert(error instanceof Error ? error.message : "Failed to archive class");
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-muted-foreground">Class not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/coach/classes/${classId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold">Class Settings</h1>
        <p className="text-muted-foreground">{classData.name}</p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update class name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ninja Level 2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will athletes learn in this class?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visibility Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Visibility & Access</CardTitle>
            <CardDescription>Control who can see and join this class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Public Class</Label>
                <p className="text-sm text-muted-foreground">
                  Anyone can discover this class in searches
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requiresApproval">Require Approval</Label>
                <p className="text-sm text-muted-foreground">
                  New members need coach approval to join
                </p>
              </div>
              <Switch
                id="requiresApproval"
                checked={requiresApproval}
                onCheckedChange={setRequiresApproval}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for this class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Archive Class</p>
                <p className="text-sm text-muted-foreground">
                  Hide this class from view. Members will no longer see it.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={archiving}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Class</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to archive &quot;{classData.name}&quot;?
                      <br /><br />
                      The class has <strong>{classData.memberCount}</strong> members and{" "}
                      <strong>{classData.benchmarkCount}</strong> benchmarks.
                      <br /><br />
                      The class will be hidden but data will be preserved. You can contact an admin to restore it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive}>
                      {archiving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Archiving...
                        </>
                      ) : (
                        "Archive Class"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
