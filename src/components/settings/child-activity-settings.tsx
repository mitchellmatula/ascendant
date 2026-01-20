"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface ChildActivitySettingsProps {
  initialValue: boolean;
}

export function ChildActivitySettings({ initialValue }: ChildActivitySettingsProps) {
  const [shareChildActivity, setShareChildActivity] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setShareChildActivity(checked);
    setIsSaving(true);

    try {
      const res = await fetchWithAuth("/api/settings/child-activity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareChildActivity: checked }),
      });

      if (!res.ok) {
        // Revert on error
        setShareChildActivity(!checked);
      }
    } catch (error) {
      console.error("Failed to update setting:", error);
      setShareChildActivity(!checked);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="text-lg">Child Activity Sharing</CardTitle>
        <CardDescription>
          Control whether your children's achievements appear in the activity feed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start space-x-3">
          <Switch
            id="share-child-activity"
            checked={shareChildActivity}
            onCheckedChange={handleToggle}
            disabled={isSaving}
          />
          <div className="flex-1">
            <Label htmlFor="share-child-activity" className="font-medium cursor-pointer">
              Share children's achievements in feed
              {isSaving && <Loader2 className="inline-block w-3 h-3 ml-2 animate-spin" />}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              When enabled, you can post updates like "@username achieved X-tier on Challenge!" 
              to celebrate your children's progress. This is off by default to protect your child's privacy.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
