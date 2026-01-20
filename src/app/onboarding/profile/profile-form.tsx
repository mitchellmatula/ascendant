"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Gender options for divisions - these affect competition brackets
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
] as const;

interface Discipline {
  id: string;
  name: string;
  icon: string | null;
}

interface ChildProfile {
  id: string; // Local ID for React key
  displayName: string;
  dateOfBirth: Date | undefined;
  gender: string;
  disciplineIds: string[];
  avatarFile: File | null;
}

const createEmptyChild = (): ChildProfile => ({
  id: crypto.randomUUID(),
  displayName: "",
  dateOfBirth: undefined,
  gender: "",
  disciplineIds: [],
  avatarFile: null,
});

function ProfileFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: clerkUser, isLoaded } = useUser();
  const accountType = searchParams.get("type") as "athlete" | "parent" | null;
  
  const [isLoading, setIsLoading] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  
  // For athlete accounts
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    dateOfBirth: undefined as Date | undefined,
    gender: "",
    disciplineIds: [] as string[],
    isPublicProfile: true, // Show on leaderboards by default
  });

  // For parent accounts - multiple children
  const [children, setChildren] = useState<ChildProfile[]>([createEmptyChild()]);
  
  // For parents who also want to compete
  const [alsoCompete, setAlsoCompete] = useState(false);
  
  // Parent consent for sharing child activity (COPPA compliance)
  const [shareChildActivity, setShareChildActivity] = useState(false);

  // Fetch disciplines
  useEffect(() => {
    fetch("/api/disciplines", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDisciplines(data);
        }
      })
      .catch(console.error);
  }, []);

  // Pre-fill display name from Clerk when loaded (for athletes or parents who compete)
  useEffect(() => {
    if (isLoaded && clerkUser) {
      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ");
      setFormData((prev) => ({
        ...prev,
        displayName: fullName || clerkUser.username || "",
      }));
    }
  }, [isLoaded, clerkUser]);

  const isParent = accountType === "parent";

  const toggleDiscipline = (disciplineId: string) => {
    setFormData((prev) => ({
      ...prev,
      disciplineIds: prev.disciplineIds.includes(disciplineId)
        ? prev.disciplineIds.filter((id) => id !== disciplineId)
        : [...prev.disciplineIds, disciplineId],
    }));
  };

  const toggleChildDiscipline = (childIndex: number, disciplineId: string) => {
    setChildren((prev) =>
      prev.map((child, i) =>
        i === childIndex
          ? {
              ...child,
              disciplineIds: child.disciplineIds.includes(disciplineId)
                ? child.disciplineIds.filter((id) => id !== disciplineId)
                : [...child.disciplineIds, disciplineId],
            }
          : child
      )
    );
  };

  const updateChild = (index: number, updates: Partial<ChildProfile>) => {
    setChildren((prev) =>
      prev.map((child, i) => (i === index ? { ...child, ...updates } : child))
    );
  };

  const addChild = () => {
    setChildren((prev) => [...prev, createEmptyChild()]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file);
  };

  const handleChildAvatarSelect = (index: number, file: File) => {
    updateChild(index, { avatarFile: file });
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const res = await fetch(
        `/api/upload/avatar?filename=${encodeURIComponent(file.name)}`,
        { method: "POST", credentials: "include", body: file }
      );
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      console.error("Avatar upload failed:", e);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isParent) {
        // Upload avatars for all children
        const childrenWithAvatars = await Promise.all(
          children.map(async (child) => ({
            displayName: child.displayName,
            dateOfBirth: child.dateOfBirth?.toISOString(),
            gender: child.gender,
            disciplineIds: child.disciplineIds,
            avatarUrl: child.avatarFile
              ? await uploadAvatar(child.avatarFile)
              : null,
          }))
        );

        // If parent also wants to compete, include their own profile
        let parentAthleteData = undefined;
        if (alsoCompete && formData.displayName && formData.dateOfBirth && formData.gender) {
          let avatarUrl: string | null = null;
          if (avatarFile) {
            avatarUrl = await uploadAvatar(avatarFile);
          }
          parentAthleteData = {
            displayName: formData.displayName,
            dateOfBirth: formData.dateOfBirth.toISOString(),
            gender: formData.gender,
            disciplineIds: formData.disciplineIds,
            avatarUrl,
            isPublicProfile: formData.isPublicProfile,
          };
        }

        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accountType,
            children: childrenWithAvatars,
            parentAthlete: parentAthleteData,
            shareChildActivity, // Parent consent for sharing child achievements
          }),
        });

        if (response.ok) {
          router.push("/dashboard");
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to create profiles:", errorData);
          setIsLoading(false);
        }
      } else {
        // Single athlete
        let avatarUrl: string | undefined;
        if (avatarFile) {
          avatarUrl = (await uploadAvatar(avatarFile)) || undefined;
        }

        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accountType,
            displayName: formData.displayName,
            dateOfBirth: formData.dateOfBirth?.toISOString(),
            gender: formData.gender,
            disciplineIds: formData.disciplineIds,
            avatarUrl,
            isPublicProfile: formData.isPublicProfile,
          }),
        });

        if (response.ok) {
          router.push("/dashboard");
        } else {
          console.error("Failed to create profile");
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      setIsLoading(false);
    }
  };

  if (!accountType) {
    router.push("/onboarding");
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Validation
  const isAthleteValid =
    formData.displayName && formData.dateOfBirth && formData.gender;
  const areChildrenValid = children.every(
    (child) => child.displayName && child.dateOfBirth && child.gender
  );
  // For parents: children must be valid, and if they want to compete, their profile must be valid too
  const isParentFormValid = areChildrenValid && (!alsoCompete || isAthleteValid);
  const isFormValid = isParent ? isParentFormValid : isAthleteValid;

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">
            {isParent ? "Add Your Children" : "Complete Your Profile"}
          </h1>
          <p className="text-muted-foreground">
            {isParent
              ? "Create profiles for your young athletes"
              : "Confirm your details to complete setup"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isParent ? (
            // PARENT: Multiple children
            <>
              {children.map((child, index) => (
                <Card key={child.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {children.length > 1 ? `Child ${index + 1}` : "Child's Profile"}
                      </CardTitle>
                      {children.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChild(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Avatar */}
                    <div className="flex justify-center">
                      <AvatarUpload
                        currentImageUrl={null}
                        onImageSelect={(file) => handleChildAvatarSelect(index, file)}
                        size="md"
                      />
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        placeholder="Enter child's name"
                        value={child.displayName}
                        onChange={(e) =>
                          updateChild(index, { displayName: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* DOB & Gender */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date of Birth *</Label>
                        <DatePicker
                          value={child.dateOfBirth}
                          onChange={(date) =>
                            updateChild(index, { dateOfBirth: date })
                          }
                          placeholder="Select date"
                          toYear={new Date().getFullYear()}
                          fromYear={2000}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender *</Label>
                        <Select
                          value={child.gender}
                          onValueChange={(value) =>
                            updateChild(index, { gender: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDER_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Disciplines */}
                    {disciplines.length > 0 && (
                      <div className="space-y-2">
                        <Label>
                          Primary Disciplines
                          <span className="ml-2 text-muted-foreground font-normal text-xs">
                            (optional)
                          </span>
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {disciplines.map((disc) => (
                            <Badge
                              key={disc.id}
                              variant={
                                child.disciplineIds.includes(disc.id)
                                  ? "default"
                                  : "outline"
                              }
                              className="cursor-pointer hover:bg-primary/80"
                              onClick={() => toggleChildDiscipline(index, disc.id)}
                            >
                              {disc.icon} {disc.name}
                              {child.disciplineIds.includes(disc.id) && " ✓"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addChild}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Child
              </Button>

              {/* Parent consent for sharing child activity (COPPA compliance) */}
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader className="pb-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="share-child-activity"
                      checked={shareChildActivity}
                      onCheckedChange={(checked) => setShareChildActivity(checked === true)}
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="share-child-activity" className="text-base font-medium cursor-pointer">
                        Share my children's achievements in the activity feed
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Allow posting updates like "@username achieved X-tier on Challenge!" 
                        to celebrate your children's progress. You can change this anytime in settings. 
                        This is off by default to protect your child's privacy.
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Option for parent to also compete */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="also-compete"
                      checked={alsoCompete}
                      onCheckedChange={(checked) => setAlsoCompete(checked === true)}
                    />
                    <div>
                      <Label htmlFor="also-compete" className="text-base font-medium cursor-pointer">
                        I also compete as an athlete
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Create your own athlete profile to track your progress
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                {alsoCompete && (
                  <CardContent className="space-y-4 pt-0">
                    {/* Avatar */}
                    <div className="flex justify-center">
                      <AvatarUpload
                        currentImageUrl={clerkUser?.imageUrl}
                        onImageSelect={handleAvatarSelect}
                        size="lg"
                      />
                    </div>

                    {/* Display Name (from Clerk) */}
                    <div className="space-y-2">
                      <Label>Your Display Name</Label>
                      <Input
                        value={formData.displayName}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    {/* DOB & Gender */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date of Birth *</Label>
                        <DatePicker
                          value={formData.dateOfBirth}
                          onChange={(date) =>
                            setFormData({ ...formData, dateOfBirth: date })
                          }
                          placeholder="Select date"
                          toYear={new Date().getFullYear()}
                          fromYear={1940}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender *</Label>
                        <Select
                          value={formData.gender}
                          onValueChange={(value) =>
                            setFormData({ ...formData, gender: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDER_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Disciplines */}
                    {disciplines.length > 0 && (
                      <div className="space-y-2">
                        <Label>
                          Your Primary Disciplines
                          <span className="ml-2 text-muted-foreground font-normal text-xs">
                            (optional)
                          </span>
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {disciplines.map((disc) => (
                            <Badge
                              key={disc.id}
                              variant={
                                formData.disciplineIds.includes(disc.id)
                                  ? "default"
                                  : "outline"
                              }
                              className="cursor-pointer hover:bg-primary/80"
                              onClick={() => toggleDiscipline(disc.id)}
                            >
                              {disc.icon} {disc.name}
                              {formData.disciplineIds.includes(disc.id) && " ✓"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Leaderboard visibility */}
                    <div className="flex items-start space-x-3 pt-2">
                      <Checkbox
                        id="parent-show-on-leaderboard"
                        checked={formData.isPublicProfile}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPublicProfile: checked === true })}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="parent-show-on-leaderboard" className="cursor-pointer">
                          Show me on the leaderboard
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Appear in public rankings and athlete searches.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </>
          ) : (
            // ATHLETE: Single profile
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  This information is used for rankings and divisions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Avatar */}
                <div className="flex justify-center">
                  <AvatarUpload
                    currentImageUrl={clerkUser?.imageUrl}
                    onImageSelect={handleAvatarSelect}
                    size="lg"
                  />
                </div>

                {/* Display Name (from Clerk) */}
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={formData.displayName}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is your name from your account.
                  </p>
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <DatePicker
                      value={formData.dateOfBirth}
                      onChange={(date) =>
                        setFormData({ ...formData, dateOfBirth: date })
                      }
                      placeholder="Select date"
                      toYear={new Date().getFullYear()}
                      fromYear={1940}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) =>
                        setFormData({ ...formData, gender: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Disciplines */}
                {disciplines.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      Primary Disciplines
                      <span className="ml-2 text-muted-foreground font-normal text-xs">
                        (optional)
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      What sports are you training for?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {disciplines.map((disc) => (
                        <Badge
                          key={disc.id}
                          variant={
                            formData.disciplineIds.includes(disc.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-primary/80"
                          onClick={() => toggleDiscipline(disc.id)}
                        >
                          {disc.icon} {disc.name}
                          {formData.disciplineIds.includes(disc.id) && " ✓"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leaderboard visibility */}
                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox
                    id="show-on-leaderboard"
                    checked={formData.isPublicProfile}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublicProfile: checked === true })}
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor="show-on-leaderboard" className="cursor-pointer">
                      Show me on the leaderboard
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Appear in public rankings and athlete searches. You can change this anytime.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !isFormValid}
            >
              {isLoading
                ? "Creating..."
                : isParent
                ? `Create ${children.length === 1 ? "Profile" : `${children.length} Profiles`}`
                : "Complete Setup"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/onboarding")}
            >
              ← Back
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProfileForm() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ProfileFormContent />
    </Suspense>
  );
}
