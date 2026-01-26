"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface InviteRedeemButtonProps {
  token: string;
  gymSlug: string;
}

export function InviteRedeemButton({ token, gymSlug }: InviteRedeemButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth(`/api/invites/${token}`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join gym");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/gym/${gymSlug}`);
        router.refresh();
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
        <p className="text-sm font-medium text-green-600">Welcome! Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      <Button 
        onClick={handleRedeem} 
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Joining...
          </>
        ) : (
          "Accept Invitation"
        )}
      </Button>
    </div>
  );
}
