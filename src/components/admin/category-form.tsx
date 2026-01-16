"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Domain {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface CategoryFormProps {
  category?: {
    id: string;
    domainId: string;
    name: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
  };
  domains: Domain[];
  defaultDomainId?: string;
  mode: "create" | "edit";
}



export function CategoryForm({ category, domains, defaultDomainId, mode }: CategoryFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    domainId: category?.domainId ?? defaultDomainId ?? "",
    name: category?.name ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "📦",
    sortOrder: category?.sortOrder ?? 0,
    isActive: category?.isActive ?? true,
  });

  const isFormValid = formData.name.trim().length >= 2 && formData.domainId.length > 0;

  // Update domainId if defaultDomainId changes
  useEffect(() => {
    if (!formData.domainId && defaultDomainId) {
      setFormData((prev) => ({ ...prev, domainId: defaultDomainId }));
    }
  }, [defaultDomainId, formData.domainId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.domainId) {
      setError("Please select a domain");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const url = mode === "create" 
        ? "/api/admin/categories" 
        : `/api/admin/categories/${category?.id}`;
      
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Something went wrong");
      }

      // Navigate back to categories, preserving the domain filter
      const returnUrl = formData.domainId 
        ? `/admin/categories?domain=${formData.domainId}`
        : "/admin/categories";
      router.push(returnUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const selectedDomain = domains.find((d) => d.id === formData.domainId);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create Category" : "Edit Category"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add a new category to organize challenges"
            : "Update the category settings"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="domainId">Domain *</Label>
            <Select
              value={formData.domainId}
              onValueChange={(value) => setFormData({ ...formData, domainId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    <span className="flex items-center gap-2">
                      <span>{domain.icon || "🎯"}</span>
                      <span>{domain.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDomain && (
              <p className="text-xs text-muted-foreground">
                This category will appear under {selectedDomain.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Balance, Climbing, Grip Strength"
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
              placeholder="Brief description of this category"
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
              Lower numbers appear first within the domain
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
              Inactive categories are hidden from athletes
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || !isFormValid} className="min-w-[120px]">
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Category"
                : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const returnUrl = formData.domainId 
                  ? `/admin/categories?domain=${formData.domainId}`
                  : "/admin/categories";
                router.push(returnUrl);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
