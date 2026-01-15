"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

interface Discipline {
  id: string;
  name: string;
  icon: string | null;
}

interface AddChildFormProps {
  disciplines: Discipline[];
}

export function AddChildForm({ disciplines }: AddChildFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    displayName: "",
    dateOfBirth: undefined as Date | undefined,
    gender: "",
    disciplineIds: [] as string[],
  });

  const toggleDiscipline = (disciplineId: string) => {
    setFormData((prev) => ({
      ...prev,
      disciplineIds: prev.disciplineIds.includes(disciplineId)
        ? prev.disciplineIds.filter((id) => id !== disciplineId)
        : [...prev.disciplineIds, disciplineId],
    }));
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const res = await fetch(
        `/api/upload/avatar?filename=${encodeURIComponent(file.name)}`,
        { method: "POST", body: file }
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

  const isValid = formData.displayName && formData.dateOfBirth && formData.gender;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Upload avatar if provided
      let avatarUrl: string | null = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const response = await fetch("/api/athletes/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.displayName,
          dateOfBirth: formData.dateOfBirth?.toISOString(),
          gender: formData.gender,
          disciplineIds: formData.disciplineIds,
          avatarUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add child");
      }

      // Redirect to dashboard with the new child selected
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Avatar */}
          <div className="flex justify-center">
            <AvatarUpload
              onFileSelect={setAvatarFile}
              currentImageUrl={null}
              size="lg"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              placeholder="Enter your child's name"
              value={formData.displayName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, displayName: e.target.value }))
              }
              required
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label>Date of Birth *</Label>
            <DatePicker
              date={formData.dateOfBirth}
              onSelect={(date) =>
                setFormData((prev) => ({ ...prev, dateOfBirth: date }))
              }
              placeholder="Select date of birth"
              fromYear={new Date().getFullYear() - 25}
              toYear={new Date().getFullYear() - 3}
            />
            <p className="text-xs text-muted-foreground">
              Used to determine age division for challenges
            </p>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender *</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gender: value }))
              }
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
              Used for division placement in challenges
            </p>
          </div>

          {/* Disciplines */}
          <div className="space-y-2">
            <Label>Primary Disciplines</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select the sports or activities your child trains in
            </p>
            <div className="flex flex-wrap gap-2">
              {disciplines.map((discipline) => {
                const isSelected = formData.disciplineIds.includes(discipline.id);
                return (
                  <Badge
                    key={discipline.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleDiscipline(discipline.id)}
                  >
                    {discipline.icon && (
                      <span className="mr-1">{discipline.icon}</span>
                    )}
                    {discipline.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Child"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
