"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DivisionFormProps {
  division?: {
    id: string;
    name: string;
    gender: string | null;
    ageMin: number | null;
    ageMax: number | null;
    sortOrder: number;
    isActive: boolean;
  };
  mode: "create" | "edit";
}

// Common division presets for quick setup
const DIVISION_PRESETS = [
  { name: "Youth Male ", gender: "male", ageMin: null, ageMax: 17 },
  { name: "Youth Female ", gender: "female", ageMin: null, ageMax: 17 },
  { name: "Adult Men ", gender: "male", ageMin: 18, ageMax: null },
  { name: "Adult Women ", gender: "female", ageMin: 18, ageMax: null },
];

export function DivisionForm({ division, mode }: DivisionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: division?.name ?? "",
    gender: division?.gender ?? null,
    ageMin: division?.ageMin ?? null,
    ageMax: division?.ageMax ?? null,
    sortOrder: division?.sortOrder ?? 0,
    isActive: division?.isActive ?? true,
  });

  const handlePreset = (preset: typeof DIVISION_PRESETS[number]) => {
    setFormData({
      ...formData,
      name: preset.name,
      gender: preset.gender,
      ageMin: preset.ageMin,
      ageMax: preset.ageMax,
    });
  };

  // Form validation
  const isAgeRangeValid = formData.ageMin === null || formData.ageMax === null || formData.ageMin <= formData.ageMax;
  const isFormValid = formData.name.trim().length >= 2 && isAgeRangeValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate name
    if (!formData.name.trim()) {
      setError("Name is required");
      setIsLoading(false);
      return;
    }

    // Validate age range
    if (formData.ageMin !== null && formData.ageMax !== null && formData.ageMin > formData.ageMax) {
      setError("Minimum age cannot be greater than maximum age");
      setIsLoading(false);
      return;
    }

    try {
      const url = mode === "create" 
        ? "/api/admin/divisions" 
        : `/api/admin/divisions/${division?.id}`;
      
      // Prepare payload - ensure nulls are properly handled
      const payload = {
        name: formData.name.trim(),
        gender: formData.gender || null,
        ageMin: formData.ageMin,
        ageMax: formData.ageMax,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };

      console.log("Submitting division:", payload);

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        // Response wasn't JSON
        data = {};
      }

      console.log("Response:", response.status, data);

      if (!response.ok) {
        // Try to extract a meaningful error message
        let errorMessage = data.error || `Request failed with status ${response.status}`;
        
        // If there are validation details, format them
        if (data.details?.fieldErrors) {
          const fieldErrors = Object.entries(data.details.fieldErrors)
            .map(([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`)
            .join("; ");
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Success! Navigate back
      router.push("/admin/divisions");
      router.refresh();
    } catch (err) {
      console.error("Division form error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const getAgeRangeLabel = () => {
    if (formData.ageMin === null && formData.ageMax === null) {
      return "All ages";
    }
    if (formData.ageMin !== null && formData.ageMax === null) {
      return `${formData.ageMin}+`;
    }
    if (formData.ageMin === null && formData.ageMax !== null) {
      return `Under ${formData.ageMax + 1}`;
    }
    return `${formData.ageMin}-${formData.ageMax}`;
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create Division" : "Edit Division"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add a new age/gender division for competition"
            : "Update the division settings"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {DIVISION_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreset(preset)}
                  >
                    {preset.name.trim()}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click a preset to auto-fill, then add age range to the name
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Youth Male 8-10"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender ?? "any"}
              onValueChange={(value) => setFormData({ ...formData, gender: value === "any" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any / All</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leave as "Any" for open divisions
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ageMin">Minimum Age</Label>
              <Input
                id="ageMin"
                type="number"
                min={0}
                max={120}
                placeholder="e.g., 8"
                value={formData.ageMin ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ageMin: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ageMax">Maximum Age</Label>
              <Input
                id="ageMax"
                type="number"
                min={0}
                max={120}
                placeholder="e.g., 10"
                value={formData.ageMax ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ageMax: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-4">
            Age range: <strong>{getAgeRangeLabel()}</strong>. Leave both empty for all ages.
          </p>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              min={0}
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
              }
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
            <Label htmlFor="isActive">Active</Label>
            <span className="text-xs text-muted-foreground">
              Inactive divisions are hidden from athletes
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || !isFormValid} className="min-w-[120px]">
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Division"
                : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/divisions")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
