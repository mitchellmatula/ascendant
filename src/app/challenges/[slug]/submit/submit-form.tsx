"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VideoUpload } from "@/components/ui/video-upload";
import { Upload, Loader2, Info } from "lucide-react";
import { XP_PER_TIER } from "@/lib/xp-constants";

interface SubmitChallengeFormProps {
  challenge: {
    id: string;
    name: string;
    slug: string;
    gradingType: string;
    gradingUnit: string | null;
    primaryDomain: {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
    };
  };
  athleteId: string;
  existingSubmission: {
    id: string;
    videoUrl: string | null;
    notes: string | null;
    achievedValue: number | null;
    status: string;
  } | null;
  grades: {
    rank: string;
    targetValue: number;
  }[];
  divisionName: string | null;
}

export function SubmitChallengeForm({
  challenge,
  athleteId,
  existingSubmission,
  grades,
  divisionName,
}: SubmitChallengeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [videoUrl, setVideoUrl] = useState(existingSubmission?.videoUrl || "");
  const [notes, setNotes] = useState(existingSubmission?.notes || "");
  const [achievedValue, setAchievedValue] = useState<string>(
    existingSubmission?.achievedValue?.toString() || ""
  );

  const isGraded = challenge.gradingType !== "PASS_FAIL";
  const isResubmission = !!existingSubmission;

  // Calculate potential tier based on input value
  const getPotentialTier = (): string | null => {
    if (!isGraded || !achievedValue) return null;
    const value = parseFloat(achievedValue);
    if (isNaN(value)) return null;

    // Find highest tier achieved
    let highestTier: string | null = null;
    const sortedGrades = [...grades].sort((a, b) => a.targetValue - b.targetValue);
    
    for (const grade of sortedGrades) {
      if (value >= grade.targetValue) {
        highestTier = grade.rank;
      }
    }
    
    return highestTier;
  };

  const potentialTier = getPotentialTier();
  const potentialXP = potentialTier ? XP_PER_TIER[potentialTier as keyof typeof XP_PER_TIER] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          videoUrl: videoUrl || null,
          notes: notes || null,
          achievedValue: isGraded && achievedValue ? parseFloat(achievedValue) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit");
      }

      // Redirect to challenge page with success
      router.push(`/challenges/${challenge.slug}?submitted=true`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = videoUrl && (!isGraded || achievedValue);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Challenge Info Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">{challenge.name}</CardTitle>
          <CardDescription>
            {isResubmission ? "Update your submission" : "Submit your attempt"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge 
            variant="secondary"
            style={{ backgroundColor: challenge.primaryDomain.color ? `${challenge.primaryDomain.color}30` : undefined }}
          >
            {challenge.primaryDomain.icon} {challenge.primaryDomain.name}
          </Badge>
          {divisionName && (
            <Badge variant="outline" className="ml-2">
              {divisionName}
            </Badge>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Existing submission warning */}
      {isResubmission && existingSubmission?.status === "PENDING" && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-yellow-600 dark:text-yellow-400">
                You have a pending submission
              </p>
              <p className="text-muted-foreground">
                Submitting again will replace your current pending submission.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Video Upload */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Video Proof *</CardTitle>
          <CardDescription>
            Upload a video showing your attempt. Keep it under 60 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VideoUpload
            value={videoUrl || null}
            onUpload={setVideoUrl}
            onRemove={() => setVideoUrl("")}
            maxDurationSeconds={60}
            maxSizeMB={100}
            enableCompression={true}
            compressionThresholdMB={10}
          />
        </CardContent>
      </Card>

      {/* Achieved Value (for graded challenges) */}
      {isGraded && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Result *</CardTitle>
            <CardDescription>
              Enter your achieved {challenge.gradingUnit || "value"}. 
              This will be verified during review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="achievedValue">
                Achieved {challenge.gradingUnit || "Value"}
              </Label>
              <Input
                id="achievedValue"
                type="number"
                min={0}
                step="any"
                placeholder={`e.g., 10`}
                value={achievedValue}
                onChange={(e) => setAchievedValue(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Tier Targets Reference */}
            {grades.length > 0 && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-2">Tier Targets:</p>
                <div className="flex flex-wrap gap-2">
                  {grades.sort((a, b) => a.targetValue - b.targetValue).map(g => (
                    <Badge 
                      key={g.rank} 
                      variant={potentialTier === g.rank ? "default" : "outline"}
                      className="text-xs"
                    >
                      {g.rank}: {g.targetValue}+ {challenge.gradingUnit || ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Potential XP Preview */}
            {potentialTier && potentialXP && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    Potential tier: <span className="font-bold">{potentialTier}</span>
                  </span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    +{potentialXP} XP
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Notes (Optional)</CardTitle>
          <CardDescription>
            Add any context about your attempt for reviewers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., First time trying this! Managed 12 reps before muscle fatigue..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button 
        type="submit" 
        size="lg" 
        className="w-full gap-2" 
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            {isResubmission ? "Update Submission" : "Submit Attempt"}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your submission will be reviewed by the community or a coach. 
        You'll be notified when it's approved.
      </p>
    </form>
  );
}
