"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EmojiPicker } from "@/components/ui/emoji-picker";

interface DisciplineFormProps {
  discipline?: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sortOrder: number;
    isActive: boolean;
  };
  mode: "create" | "edit";
}



// Preset colors for disciplines
const COLOR_OPTIONS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

// Quick presets for common disciplines
const DISCIPLINE_PRESETS = [
  { name: "Ninja", icon: "🥷", color: "#ef4444" },
  { name: "Calisthenics", icon: "🤸", color: "#8b5cf6" },
  { name: "Parkour", icon: "🏃", color: "#22c55e" },
  { name: "CrossFit", icon: "🏋️", color: "#f97316" },
  { name: "Rock Climbing", icon: "🧗", color: "#3b82f6" },
  { name: "Sprinting", icon: "⚡", color: "#eab308" },
];

export function DisciplineForm({ discipline, mode }: DisciplineFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: discipline?.name ?? "",
    description: discipline?.description ?? "",
    icon: discipline?.icon ?? "🥷",
    color: discipline?.color ?? "#3b82f6",
    sortOrder: discipline?.sortOrder ?? 0,
    isActive: discipline?.isActive ?? true,
  });

  const isFormValid = formData.name.trim().length >= 2;

  const handlePreset = (preset: typeof DISCIPLINE_PRESETS[number]) => {
    setFormData({
      ...formData,
      name: preset.name,
      icon: preset.icon,
      color: preset.color,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = mode === "create" 
        ? "/api/admin/disciplines" 
        : `/api/admin/disciplines/${discipline?.id}`;
      
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let errorMessage = data.error || "Something went wrong";
        
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

      router.push("/admin/disciplines");
      router.refresh();
    } catch (err) {
      console.error("Discipline form error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create Discipline" : "Edit Discipline"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add a new sport or training discipline"
            : "Update the discipline settings"}
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
                {DISCIPLINE_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreset(preset)}
                    className="text-xs"
                  >
                    {preset.icon} {preset.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click a preset to auto-fill, or configure manually below
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Ninja"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={2}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of this discipline"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex items-center gap-3">
              <EmojiPicker
                value={formData.icon}
                onChange={(emoji) => setFormData({ ...formData, icon: emoji })}
              />
              <p className="text-sm text-muted-foreground">
                Click to search and select an emoji
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="customColor" className="text-xs text-muted-foreground">
                Custom:
              </Label>
              <Input
                id="customColor"
                type="color"
                className="w-12 h-8 p-0 border-0"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
              <span className="text-xs text-muted-foreground">{formData.color}</span>
            </div>
          </div>

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
              Inactive disciplines are hidden from athletes
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || !isFormValid} className="min-w-[120px]">
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Discipline"
                : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/disciplines")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
