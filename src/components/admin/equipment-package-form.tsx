"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Package, Dumbbell, Plus, Minus, X, CheckCircle2, Loader2, Search 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Equipment {
  id: string;
  name: string;
  icon: string | null;
}

interface PackageItem {
  equipmentId: string;
  quantity: number;
  equipment?: Equipment;
}

interface EquipmentPackageFormProps {
  package?: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
    items: {
      id: string;
      equipmentId: string;
      quantity: number;
      equipment: Equipment;
    }[];
  };
  equipment: Equipment[];
  mode: "create" | "edit";
}

export function EquipmentPackageForm({
  package: pkg,
  equipment,
  mode,
}: EquipmentPackageFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    icon: pkg?.icon ?? "📦",
    sortOrder: pkg?.sortOrder ?? 0,
    isActive: pkg?.isActive ?? true,
  });

  const [selectedItems, setSelectedItems] = useState<PackageItem[]>(
    pkg?.items.map((item) => ({
      equipmentId: item.equipmentId,
      quantity: item.quantity,
      equipment: item.equipment,
    })) ?? []
  );

  const isFormValid = formData.name.trim().length >= 2;

  // Filter equipment based on search
  const filteredEquipment = equipment.filter((eq) =>
    eq.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Equipment that's not yet added
  const availableEquipment = filteredEquipment.filter(
    (eq) => !selectedItems.some((item) => item.equipmentId === eq.id)
  );

  const addEquipment = (eq: Equipment) => {
    setSelectedItems((prev) => [
      ...prev,
      { equipmentId: eq.id, quantity: 1, equipment: eq },
    ]);
  };

  const removeEquipment = (equipmentId: string) => {
    setSelectedItems((prev) =>
      prev.filter((item) => item.equipmentId !== equipmentId)
    );
  };

  const updateQuantity = (equipmentId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.equipmentId === equipmentId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url =
        mode === "create"
          ? "/api/admin/equipment-packages"
          : `/api/admin/equipment-packages/${pkg?.id}`;

      const submitData = {
        ...formData,
        description: formData.description?.trim() || null,
        icon: formData.icon?.trim() || null,
        items: selectedItems.map((item) => ({
          equipmentId: item.equipmentId,
          quantity: item.quantity,
        })),
      };

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      router.push("/admin/equipment-packages");
      router.refresh();
    } catch (err) {
      console.error("Equipment package form error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  // Common emoji icons for packages
  const iconOptions = ["📦", "🏋️", "🥷", "💪", "🎯", "⚡", "🔥", "🏆"];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Package Details
          </CardTitle>
          <CardDescription>
            Basic information about this equipment package
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-[auto,1fr] gap-4">
            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={cn(
                      "w-10 h-10 text-xl rounded-lg border transition-all",
                      formData.icon === emoji
                        ? "bg-primary/10 border-primary ring-2 ring-primary"
                        : "bg-muted hover:bg-accent"
                    )}
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Package Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Standard Ninja Gym"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                minLength={2}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/100 characters
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what types of gyms would use this package..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive" className="font-normal">
                  {formData.isActive ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Equipment in Package
          </CardTitle>
          <CardDescription>
            Select the equipment included in this package ({selectedItems.length} items)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Equipment */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Equipment</Label>
              <div className="grid gap-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.equipmentId}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <span className="text-xl">
                      {item.equipment?.icon || "🏋️"}
                    </span>
                    <span className="flex-1 font-medium">
                      {item.equipment?.name}
                    </span>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.equipmentId, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.equipmentId, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeEquipment(item.equipmentId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Equipment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Add Equipment</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {availableEquipment.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {availableEquipment.map((eq) => (
                  <Badge
                    key={eq.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1.5 px-3"
                    onClick={() => addEquipment(eq)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {eq.icon && <span className="mr-1">{eq.icon}</span>}
                    {eq.name}
                  </Badge>
                ))}
              </div>
            ) : equipment.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No equipment has been created yet.{" "}
                <a
                  href="/admin/equipment/new"
                  className="text-primary hover:underline"
                >
                  Add equipment first →
                </a>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                {searchQuery
                  ? "No matching equipment found"
                  : "All equipment has been added to this package"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !isFormValid}
          className="min-w-[140px] h-11"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {mode === "create" ? "Create Package" : "Save Changes"}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/equipment-packages")}
          className="h-11"
          size="lg"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
