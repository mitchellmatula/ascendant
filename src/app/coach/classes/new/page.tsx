"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface Gym {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface GymStaff {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

export default function NewClassPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGymId = searchParams.get("gymId");
  
  const [loading, setLoading] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [gymStaff, setGymStaff] = useState<GymStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gymId, setGymId] = useState<string>(preselectedGymId || "");
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);

  useEffect(() => {
    async function loadGyms() {
      try {
        const res = await fetchWithAuth("/api/coach/gyms");
        if (res.ok) {
          const data = await res.json();
          setGyms(data.gyms || []);
          
          if (preselectedGymId && data.gyms?.some((g: Gym) => g.id === preselectedGymId)) {
            setGymId(preselectedGymId);
          }
        }
      } catch (error) {
        console.error("Failed to load gyms:", error);
      } finally {
        setLoadingGyms(false);
      }
    }
    loadGyms();
  }, [preselectedGymId]);

  // Load gym staff when gym is selected
  useEffect(() => {
    async function loadGymStaff() {
      if (!gymId || gymId === "none") {
        setGymStaff([]);
        setSelectedCoaches([]);
        return;
      }

      setLoadingStaff(true);
      try {
        const res = await fetchWithAuth(`/api/coach/gyms/${gymId}/staff`);
        if (res.ok) {
          const data = await res.json();
          setGymStaff(data.staff || []);
        }
      } catch (error) {
        console.error("Failed to load gym staff:", error);
      } finally {
        setLoadingStaff(false);
      }
    }
    loadGymStaff();
  }, [gymId]);

  const toggleCoach = (userId: string) => {
    setSelectedCoaches(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          gymId: gymId && gymId !== "none" ? gymId : undefined,
          coachUserIds: selectedCoaches.length > 0 ? selectedCoaches : undefined,
          isPublic,
          requiresApproval,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create class");
      }

      const { class: newClass } = await res.json();
      router.push(`/coach/classes/${newClass.id}`);
    } catch (error) {
      console.error("Error creating class:", error);
      alert(error instanceof Error ? error.message : "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/coach"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="w-7 h-7" />
          Create New Class
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Set up a new class to track athletes and assign benchmarks
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Details</CardTitle>
          <CardDescription>
            Enter the basic information for your class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monday Night Ninja, Kids Beginner Class"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this class is about..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gym">Associated Gym (Optional)</Label>
              {loadingGyms ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading gyms...
                </div>
              ) : gyms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No gyms available. You can still create a class without a gym association.
                </p>
              ) : (
                <Select value={gymId} onValueChange={setGymId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a gym (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No gym association</SelectItem>
                    {gyms.map((gym) => (
                      <SelectItem key={gym.id} value={gym.id}>
                        {gym.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Link this class to a gym for better organization
              </p>
            </div>

            {/* Coach Selection */}
            {gymId && gymId !== "none" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Class Coaches
                </Label>
                {loadingStaff ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading staff...
                  </div>
                ) : gymStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No staff found. You&apos;ll be assigned as the coach.
                  </p>
                ) : (
                  <div className="space-y-2 rounded-lg border p-3">
                    {gymStaff.map((staff) => (
                      <label
                        key={staff.userId}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedCoaches.includes(staff.userId)}
                          onCheckedChange={() => toggleCoach(staff.userId)}
                        />
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={staff.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {staff.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{staff.displayName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{staff.role.toLowerCase()}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedCoaches.length === 0 
                    ? "Select coaches for this class, or leave empty to be assigned yourself"
                    : `${selectedCoaches.length} coach${selectedCoaches.length > 1 ? "es" : ""} selected`}
                </p>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Privacy Settings</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isPublic">Public Class</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow athletes to discover and join this class
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requiresApproval">Require Approval</Label>
                  <p className="text-xs text-muted-foreground">
                    Review join requests before adding athletes
                  </p>
                </div>
                <Switch
                  id="requiresApproval"
                  checked={requiresApproval}
                  onCheckedChange={setRequiresApproval}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href="/coach">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Class"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
