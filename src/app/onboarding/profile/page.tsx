"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: clerkUser, isLoaded } = useUser();
  const accountType = searchParams.get("type") as "athlete" | "parent" | null;
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    dateOfBirth: undefined as Date | undefined,
    gender: "" as "male" | "female" | "",
  });

  // Pre-fill display name from Clerk when loaded
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
  const title = isParent ? "Add Your First Child" : "Complete Your Profile";
  const description = isParent
    ? "Enter your child's information to create their athlete profile"
    : "Confirm your details to complete your athlete profile";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dateOfBirth) return;
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          displayName: formData.displayName,
          dateOfBirth: formData.dateOfBirth.toISOString(),
          gender: formData.gender,
        }),
      });

      if (response.ok) {
        router.push("/dashboard");
      } else {
        console.error("Failed to create profile");
        setIsLoading(false);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">
                {isParent ? "Child's Name" : "Display Name"}
              </Label>
              {isParent ? (
                <Input
                  id="displayName"
                  placeholder="Enter your child's name"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  required
                />
              ) : (
                <>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is your name from your account. To change it, update your profile in account settings.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <DatePicker
                value={formData.dateOfBirth}
                onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
                placeholder="Select date of birth"
                toYear={new Date().getFullYear()}
                fromYear={1940}
              />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.gender === "male" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFormData({ ...formData, gender: "male" })}
                >
                  Male
                </Button>
                <Button
                  type="button"
                  variant={formData.gender === "female" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setFormData({ ...formData, gender: "female" })}
                >
                  Female
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                isLoading ||
                !formData.displayName ||
                !formData.dateOfBirth ||
                !formData.gender
              }
            >
              {isLoading ? "Creating..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
