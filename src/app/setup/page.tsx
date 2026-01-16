"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if bootstrap is available
    fetch("/api/admin/bootstrap", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setIsAvailable(data.available);
        if (!data.available) {
          // Already has admin, redirect to admin panel
          router.push("/admin");
        }
      })
      .catch(() => {
        setError("Failed to check setup status");
      });
  }, [router]);

  const handleBootstrap = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/admin");
        }, 2000);
      } else {
        setError(data.error || "Failed to complete setup");
      }
    } catch {
      setError("Failed to complete setup");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAvailable === null) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Checking setup status...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-green-500">✓ Setup Complete!</CardTitle>
            <CardDescription>
              Redirecting you to the admin panel...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🚀</span>
            Initial Setup
          </CardTitle>
          <CardDescription>
            No system administrator has been configured yet. 
            Click below to become the first admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>As a System Admin, you will be able to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create and manage domains & categories</li>
              <li>Create challenges and set requirements</li>
              <li>Configure age/gender divisions</li>
              <li>Review athlete submissions</li>
              <li>Manage user roles</li>
            </ul>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleBootstrap}
            disabled={isLoading}
          >
            {isLoading ? "Setting up..." : "Make Me Admin"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
