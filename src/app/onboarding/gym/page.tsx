"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Discipline {
  id: string;
  name: string;
  icon: string | null;
}

export default function GymOnboardingPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  
  const [isLoading, setIsLoading] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    city: "",
    state: "",
    website: "",
    disciplineIds: [] as string[],
  });

  // Fetch disciplines
  useEffect(() => {
    fetch("/api/disciplines")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDisciplines(data);
        }
      })
      .catch(console.error);
  }, []);

  const toggleDiscipline = (disciplineId: string) => {
    setFormData((prev) => ({
      ...prev,
      disciplineIds: prev.disciplineIds.includes(disciplineId)
        ? prev.disciplineIds.filter((id) => id !== disciplineId)
        : [...prev.disciplineIds, disciplineId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/onboarding/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/dashboard?welcome=gym");
      } else {
        const data = await response.json();
        console.error("Failed to create gym:", data.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error creating gym:", error);
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isFormValid = formData.name.trim().length >= 2;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            Register Your Gym
          </CardTitle>
          <CardDescription>
            Set up your gym on Ascendant. You can add more details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Gym Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Ninja City Training Center"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell athletes about your gym..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="San Francisco"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="California"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourgym.com"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </div>

            {disciplines.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Disciplines
                  <span className="ml-2 text-muted-foreground font-normal">
                    ({formData.disciplineIds.length} selected)
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  What sports/activities does your gym focus on?
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

            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? "Creating Gym..." : "Create Gym"}
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
        </CardContent>
      </Card>
    </div>
  );
}
