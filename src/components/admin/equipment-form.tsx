"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";

interface Discipline {
  id: string;
  name: string;
  icon: string | null;
}

interface EquipmentFormProps {
  equipment?: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    disciplines?: { discipline: Discipline }[];
  };
  disciplines: Discipline[];
  mode: "create" | "edit";
}

// Common emoji icons for equipment
const ICON_OPTIONS = ["🪜", "🏋️", "💪", "🔗", "⭕", "🧱", "🪵", "🛗", "⬆️", "🎯"];

// Quick presets for common ninja/gym equipment
const EQUIPMENT_PRESETS = [
  { name: "Salmon Ladder", icon: "🪜" },
  { name: "Warped Wall", icon: "⬆️" },
  { name: "Pull-up Bar", icon: "💪" },
  { name: "Rings", icon: "⭕" },
  { name: "Climbing Holds", icon: "🧱" },
  { name: "Peg Board", icon: "🔗" },
  { name: "Lache Bars", icon: "🪵" },
  { name: "Rope", icon: "🔗" },
  { name: "Cargo Net", icon: "🔗" },
  { name: "Balance Beam", icon: "🪵" },
  { name: "Parallel Bars", icon: "🛗" },
  { name: "Monkey Bars", icon: "🪜" },
];

export function EquipmentForm({ equipment, disciplines, mode }: EquipmentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: equipment?.name ?? "",
    description: equipment?.description ?? "",
    icon: equipment?.icon ?? "🏋️",
    imageUrl: equipment?.imageUrl ?? "",
    sortOrder: equipment?.sortOrder ?? 0,
    isActive: equipment?.isActive ?? true,
    disciplineIds: equipment?.disciplines?.map(d => d.discipline.id) ?? [],
  });

  const isFormValid = formData.name.trim().length >= 2;

  const toggleDiscipline = (disciplineId: string) => {
    setFormData(prev => ({
      ...prev,
      disciplineIds: prev.disciplineIds.includes(disciplineId)
        ? prev.disciplineIds.filter(id => id !== disciplineId)
        : [...prev.disciplineIds, disciplineId],
    }));
  };

  const handlePreset = (preset: typeof EQUIPMENT_PRESETS[number]) => {
    setFormData({
      ...formData,
      name: preset.name,
      icon: preset.icon,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = mode === "create" 
        ? "/api/admin/equipment" 
        : `/api/admin/equipment/${equipment?.id}`;
      
      const submitData = {
        ...formData,
        imageUrl: formData.imageUrl?.trim() || null,
        disciplineIds: formData.disciplineIds,
      };

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
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

      router.push("/admin/equipment");
      router.refresh();
    } catch (err) {
      console.error("Equipment form error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create Equipment" : "Edit Equipment"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add gym equipment that challenges may require"
            : "Update the equipment settings"}
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
                {EQUIPMENT_PRESETS.map((preset) => (
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
              placeholder="e.g., Salmon Ladder"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of this equipment"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`w-12 h-12 text-2xl rounded-lg border-2 transition-colors flex items-center justify-center ${
                    formData.icon === icon
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Or enter a custom emoji:
              <Input
                className="mt-1 w-20"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                maxLength={10}
              />
            </p>
          </div>

          <div className="space-y-2">
            <Label>Equipment Image (Optional)</Label>
            <ImageUpload
              uploadEndpoint="/api/upload/equipment"
              currentImageUrl={formData.imageUrl || undefined}
              onUpload={(url) => setFormData({ ...formData, imageUrl: url })}
              onRemove={() => setFormData({ ...formData, imageUrl: "" })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Disciplines 
              <span className="ml-2 text-muted-foreground font-normal">
                ({formData.disciplineIds.length} selected)
              </span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Link this equipment to disciplines. Helps filter equipment when creating challenges.
            </p>
            <div className="flex flex-wrap gap-2">
              {disciplines.map((disc) => (
                <Badge
                  key={disc.id}
                  variant={formData.disciplineIds.includes(disc.id) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleDiscipline(disc.id)}
                >
                  {disc.icon} {disc.name}
                  {formData.disciplineIds.includes(disc.id) && " ✓"}
                </Badge>
              ))}
            </div>
            {disciplines.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No disciplines created yet. <a href="/admin/disciplines" className="underline">Add disciplines</a>
              </p>
            )}
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
              Inactive equipment is hidden from challenges
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || !isFormValid} className="min-w-[120px]">
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Equipment"
                : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/equipment")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
