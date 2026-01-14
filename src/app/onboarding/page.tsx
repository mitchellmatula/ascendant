"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [accountType, setAccountType] = useState<"athlete" | "parent" | "gym_owner" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!accountType || !user) return;
    
    setIsLoading(true);
    
    // Navigate to appropriate setup page
    if (accountType === "gym_owner") {
      router.push("/onboarding/gym");
    } else {
      router.push(`/onboarding/profile?type=${accountType}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to Ascendant</h1>
          <p className="text-muted-foreground">
            Let&apos;s get you set up. First, tell us about yourself.
          </p>
        </div>

        <div className="grid gap-4">
          <Card
            className={`cursor-pointer transition-all ${
              accountType === "athlete"
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setAccountType("athlete")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">🏃</span>
                I&apos;m an Athlete
              </CardTitle>
              <CardDescription>
                I&apos;m 18 or older and competing for myself
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Track your own progress</li>
                <li>• Submit challenge completions</li>
                <li>• Level up across all domains</li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              accountType === "parent"
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setAccountType("parent")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                I&apos;m a Parent
              </CardTitle>
              <CardDescription>
                I&apos;m managing one or more young athletes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create profiles for your children</li>
                <li>• Submit challenges on their behalf</li>
                <li>• Track all your kids&apos; progress</li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              accountType === "gym_owner"
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setAccountType("gym_owner")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">🏢</span>
                I&apos;m a Gym Owner
              </CardTitle>
              <CardDescription>
                I own or manage a training facility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Register your gym on Ascendant</li>
                <li>• Create gym-specific challenges</li>
                <li>• Manage members and coaches</li>
                <li>• Track your athletes&apos; progress</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!accountType || isLoading}
          onClick={handleContinue}
        >
          {isLoading ? "Loading..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
