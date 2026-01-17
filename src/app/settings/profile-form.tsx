"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface ProfileFormProps {
  athlete: {
    id: string;
    displayName: string;
    username: string | null;
    dateOfBirth: Date;
    gender: string;
    avatarUrl: string | null;
    disciplines: { discipline: Discipline }[];
  };
  disciplines: Discipline[];
  isOwnProfile: boolean; // true if editing own profile, false if editing child
}

export function ProfileForm({ athlete, disciplines, isOwnProfile }: ProfileFormProps) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  
  // Store initial values for comparison
  const initialValues = useMemo(
    () => ({
      displayName: athlete.displayName,
      username: athlete.username || "",
      dateOfBirth: new Date(athlete.dateOfBirth).toDateString(),
      gender: athlete.gender,
      disciplineIds: athlete.disciplines.map((d) => d.discipline.id).sort(),
    }),
    [athlete]
  );
  
  const [formData, setFormData] = useState({
    displayName: athlete.displayName,
    username: athlete.username || "",
    dateOfBirth: new Date(athlete.dateOfBirth),
    gender: athlete.gender,
    disciplineIds: athlete.disciplines.map((d) => d.discipline.id),
  });

  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Check if form has unsaved changes
  const hasChanges = useMemo(() => {
    if (avatarFile) return true;
    if (formData.displayName !== initialValues.displayName) return true;
    if (formData.username !== initialValues.username) return true;
    if (formData.gender !== initialValues.gender) return true;
    if (formData.dateOfBirth.toDateString() !== initialValues.dateOfBirth) return true;
    
    const currentDisciplines = [...formData.disciplineIds].sort();
    if (currentDisciplines.length !== initialValues.disciplineIds.length) return true;
    if (!currentDisciplines.every((id, i) => id === initialValues.disciplineIds[i])) return true;
    
    return false;
  }, [formData, avatarFile, initialValues]);

  // Validate username format
  const validateUsername = (value: string): string | null => {
    if (!value) return "Username is required";
    if (value.length < 3) return "Username must be at least 3 characters";
    if (value.length > 30) return "Username must be 30 characters or less";
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Only letters, numbers, and underscores allowed";
    return null;
  };

  const toggleDiscipline = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      disciplineIds: prev.disciplineIds.includes(id)
        ? prev.disciplineIds.filter((d) => d !== id)
        : [...prev.disciplineIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate username
    const usernameValidationError = validateUsername(formData.username);
    if (usernameValidationError) {
      setUsernameError(usernameValidationError);
      return;
    }
    
    setIsLoading(true);
    setUsernameError(null);

    try {
      // Upload avatar if changed
      let avatarUrl = athlete.avatarUrl;
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append("file", avatarFile);
        const uploadRes = await fetch("/api/upload/avatar", {
          method: "POST",
          credentials: "include",
          body: avatarFormData,
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          avatarUrl = url;
        }
      }

      // Update athlete
      const response = await fetch(`/api/athletes/profile/${athlete.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          dateOfBirth: formData.dateOfBirth?.toISOString(),
          avatarUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error?.includes("username")) {
          setUsernameError(data.error);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to update profile");
      }

      // If avatar was updated on own profile, reload Clerk user to refresh header avatar
      if (avatarFile && isOwnProfile && clerkUser) {
        await clerkUser.reload();
      }

      // Reset avatar file state so hasChanges becomes false
      setAvatarFile(null);

      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isOwnProfile ? "My Profile" : `${athlete.displayName}'s Profile`}</CardTitle>
          <CardDescription>
            {isOwnProfile 
              ? "Update your athlete profile information" 
              : "Update your child's profile information"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex justify-center">
            <AvatarUpload
              currentImageUrl={athlete.avatarUrl}
              onImageSelect={setAvatarFile}
              size="lg"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Enter display name"
              required
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value.toLowerCase() });
                  setUsernameError(null);
                }}
                placeholder="username"
                className="pl-8"
                required
              />
            </div>
            {usernameError && (
              <p className="text-sm text-destructive">{usernameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Your unique identifier for mentions and profile URL
            </p>
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <DatePicker
              value={formData.dateOfBirth}
              onChange={(date) => setFormData({ ...formData, dateOfBirth: date ?? new Date() })}
            />
            <p className="text-xs text-muted-foreground">
              Used to determine your competition division
            </p>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for competition division placement
            </p>
          </div>

          {/* Disciplines */}
          <div className="space-y-2">
            <Label>Training Disciplines</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Select the disciplines you train in
            </p>
            <div className="flex flex-wrap gap-2">
              {disciplines.map((discipline) => (
                <Badge
                  key={discipline.id}
                  variant={formData.disciplineIds.includes(discipline.id) ? "default" : "outline"}
                  className="cursor-pointer text-sm py-1.5 px-3"
                  onClick={() => toggleDiscipline(discipline.id)}
                >
                  {discipline.icon && <span className="mr-1">{discipline.icon}</span>}
                  {discipline.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button ref={saveButtonRef} type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Unsaved Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <button
            type="button"
            onClick={() => saveButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="flex items-center gap-2 bg-amber-500 text-amber-950 px-4 py-2.5 rounded-full shadow-lg border border-amber-600 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Unsaved changes</span>
          </button>
        </div>
      )}
    </form>
  );
}
