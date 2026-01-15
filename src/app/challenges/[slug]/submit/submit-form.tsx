"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { VideoUpload } from "@/components/ui/video-upload";
import { ImageUpload } from "@/components/ui/image-upload";
import { StravaActivityPicker } from "@/components/strava/strava-activity-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Loader2, Info, Video, Image as ImageIcon, Zap, CheckCircle2, ExternalLink, Settings2 } from "lucide-react";
import { XP_PER_TIER } from "@/lib/xp-constants";
import { formatSecondsToTime, type TimeFormat } from "@/lib/time";

// Dynamically import map to avoid SSR issues with Leaflet
const StravaRouteMap = dynamic(
  () => import("@/components/strava/strava-route-map").then((m) => m.StravaRouteMap),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded-lg" /> }
);

type ProofType = "VIDEO" | "IMAGE" | "STRAVA" | "GARMIN" | "MANUAL";

interface SubmitChallengeFormProps {
  challenge: {
    id: string;
    name: string;
    slug: string;
    gradingType: string;
    gradingUnit: string | null;
    timeFormat: string | null;
    primaryDomain: {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
    };
    proofTypes: string[];
    activityType: string | null;
    minDistance: number | null;
    maxDistance: number | null;
    minElevationGain: number | null;
    requiresGPS: boolean;
    requiresHeartRate: boolean;
  };
  athleteId: string;
  existingSubmission: {
    id: string;
    videoUrl: string | null;
    notes: string | null;
    achievedValue: number | null;
    status: string;
    proofType: ProofType;
    stravaActivityId: string | null;
    stravaActivityUrl: string | null;
    isPublic: boolean;
    hideExactValue: boolean;
  } | null;
  grades: {
    rank: string;
    targetValue: number;
  }[];
  divisionName: string | null;
  hasStravaConnected: boolean;
}

export function SubmitChallengeForm({
  challenge,
  athleteId,
  existingSubmission,
  grades,
  divisionName,
  hasStravaConnected,
}: SubmitChallengeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine available proof types for this challenge
  const availableProofTypes = challenge.proofTypes as ProofType[];
  const hasMultipleProofTypes = availableProofTypes.length > 1;
  
  // Default to first available proof type, or existing submission's type
  const [proofType, setProofType] = useState<ProofType>(
    existingSubmission?.proofType || availableProofTypes[0] || "VIDEO"
  );

  const [videoUrl, setVideoUrl] = useState(existingSubmission?.videoUrl || "");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState(existingSubmission?.notes || "");
  const [achievedValue, setAchievedValue] = useState<string>(
    existingSubmission?.achievedValue?.toString() || ""
  );

  // Privacy settings
  const [isPublic, setIsPublic] = useState(existingSubmission?.isPublic ?? true);
  const [hideExactValue, setHideExactValue] = useState(existingSubmission?.hideExactValue ?? false);

  // Strava activity state
  const [stravaActivity, setStravaActivity] = useState<{
    id: string;
    name: string;
    type: string;
    date: string;
    distance: number;
    distanceKm: string;
    movingTime: number;
    movingTimeFormatted: string;
    elevationGain: number;
    stravaUrl: string;
    polyline: string | null;
    startLatLng: [number, number] | null;
    endLatLng: [number, number] | null;
    validation: { valid: boolean; errors: string[] };
  } | null>(
    existingSubmission?.stravaActivityId
      ? {
          id: existingSubmission.stravaActivityId,
          name: "Previously selected activity",
          type: "",
          date: "",
          distance: 0,
          distanceKm: "",
          movingTime: 0,
          movingTimeFormatted: "",
          elevationGain: 0,
          stravaUrl: existingSubmission.stravaActivityUrl || "",
          polyline: null,
          startLatLng: null,
          endLatLng: null,
          validation: { valid: true, errors: [] },
        }
      : null
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
      const body: Record<string, unknown> = {
        challengeId: challenge.id,
        proofType,
        notes: notes || null,
        achievedValue: isGraded && achievedValue ? parseFloat(achievedValue) : null,
        isPublic,
        hideExactValue,
      };

      // Add proof-specific fields
      if (proofType === "VIDEO") {
        body.videoUrl = videoUrl || null;
      } else if (proofType === "IMAGE") {
        body.imageUrl = imageUrl || null;
      } else if (proofType === "STRAVA" && stravaActivity) {
        body.stravaActivityId = stravaActivity.id;
        body.stravaActivityUrl = stravaActivity.stravaUrl;
        body.activityDistance = stravaActivity.distance;
        body.activityTime = stravaActivity.movingTime;
        body.activityElevation = stravaActivity.elevationGain;
        body.activityType = stravaActivity.type;
      }

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  // Determine if form can be submitted based on proof type
  const hasProof = () => {
    switch (proofType) {
      case "VIDEO":
        return !!videoUrl;
      case "IMAGE":
        return !!imageUrl;
      case "STRAVA":
        return !!stravaActivity;
      case "GARMIN":
        return false; // Not implemented yet
      case "MANUAL":
        return true; // No proof required
      default:
        return false;
    }
  };

  const canSubmit = hasProof() && (!isGraded || achievedValue);

  // Proof type display info
  const proofTypeInfo: Record<ProofType, { icon: React.ReactNode; label: string; description: string }> = {
    VIDEO: {
      icon: <Video className="h-4 w-4" />,
      label: "Video",
      description: "Upload a video showing your attempt",
    },
    IMAGE: {
      icon: <ImageIcon className="h-4 w-4" />,
      label: "Photo",
      description: "Upload a photo as proof",
    },
    STRAVA: {
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#FC4C02">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
      ),
      label: "Strava",
      description: "Link a Strava activity",
    },
    GARMIN: {
      icon: <Zap className="h-4 w-4" />,
      label: "Garmin",
      description: "Link a Garmin activity",
    },
    MANUAL: {
      icon: <Settings2 className="h-4 w-4" />,
      label: "Manual",
      description: "Coach/admin verified",
    },
  };

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

      {/* Proof Type Selection */}
      {hasMultipleProofTypes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Proof Method</CardTitle>
            <CardDescription>
              Choose how you want to verify your attempt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={proofType}
              onValueChange={(v) => setProofType(v as ProofType)}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {availableProofTypes.map((type) => {
                const info = proofTypeInfo[type];
                const isStravaUnavailable = type === "STRAVA" && !hasStravaConnected;
                const isGarminUnavailable = type === "GARMIN"; // Not implemented yet
                const isDisabled = isStravaUnavailable || isGarminUnavailable;

                return (
                  <Label
                    key={type}
                    htmlFor={`proof-${type}`}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                      proofType === type
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <RadioGroupItem
                      value={type}
                      id={`proof-${type}`}
                      disabled={isDisabled}
                    />
                    <span className="flex items-center gap-1.5">
                      {info.icon}
                      {info.label}
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>

            {/* Strava not connected warning */}
            {availableProofTypes.includes("STRAVA") && !hasStravaConnected && (
              <div className="mt-3 p-2 rounded bg-muted text-sm flex items-center justify-between">
                <span className="text-muted-foreground">Strava not connected</span>
                <Link
                  href="/settings/connections"
                  className="text-primary hover:underline text-xs"
                >
                  Connect →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proof Upload - Video */}
      {proofType === "VIDEO" && (
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
      )}

      {/* Proof Upload - Image */}
      {proofType === "IMAGE" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Photo Proof *</CardTitle>
            <CardDescription>
              Upload a photo showing your completed attempt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={imageUrl || null}
              onUpload={setImageUrl}
              onRemove={() => setImageUrl("")}
            />
          </CardContent>
        </Card>
      )}

      {/* Proof Upload - Strava */}
      {proofType === "STRAVA" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FC4C02">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Strava Activity *
            </CardTitle>
            <CardDescription>
              Select a Strava activity as proof for this challenge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasStravaConnected ? (
              <div className="p-4 rounded-lg border border-dashed text-center">
                <p className="text-muted-foreground mb-2">
                  Connect your Strava account to use activity proof
                </p>
                <Link href="/settings/connections">
                  <Button type="button" variant="outline">
                    Connect Strava
                  </Button>
                </Link>
              </div>
            ) : stravaActivity ? (
              // Selected activity display
              <div className="p-4 rounded-lg border bg-muted/50">
                {/* Route map */}
                {stravaActivity.polyline && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <StravaRouteMap
                      polyline={stravaActivity.polyline}
                      startLatLng={stravaActivity.startLatLng}
                      endLatLng={stravaActivity.endLatLng}
                      height={140}
                      interactive={true}
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{stravaActivity.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {stravaActivity.distanceKm && (
                        <p>Distance: {stravaActivity.distanceKm} km</p>
                      )}
                      {stravaActivity.movingTimeFormatted && (
                        <p>Time: {stravaActivity.movingTimeFormatted}</p>
                      )}
                      {stravaActivity.elevationGain > 0 && (
                        <p>Elevation: {stravaActivity.elevationGain}m</p>
                      )}
                    </div>
                    {!stravaActivity.validation.valid && (
                      <div className="mt-2 space-y-1">
                        {stravaActivity.validation.errors.map((err, i) => (
                          <Badge key={i} variant="secondary" className="text-red-600 bg-red-50 text-xs">
                            {err}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <a
                      href={stravaActivity.stravaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FC4C02] hover:underline text-sm flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStravaActivity(null)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Activity picker trigger
              <StravaActivityPicker
                challengeId={challenge.id}
                onSelect={(activity) => {
                  setStravaActivity({
                    id: activity.id,
                    name: activity.name,
                    type: activity.type,
                    date: activity.date,
                    distance: activity.distance,
                    distanceKm: activity.distanceKm,
                    movingTime: activity.movingTime,
                    movingTimeFormatted: activity.movingTimeFormatted,
                    elevationGain: activity.elevationGain,
                    stravaUrl: activity.stravaUrl,
                    polyline: activity.polyline,
                    startLatLng: activity.startLatLng,
                    endLatLng: activity.endLatLng,
                    validation: activity.validation,
                  });
                  
                  // Auto-fill achievedValue based on grading type
                  if (isGraded) {
                    let autoValue: number | null = null;
                    
                    switch (challenge.gradingType) {
                      case "TIME":
                        // Use moving time in seconds
                        autoValue = activity.movingTime;
                        break;
                      case "DISTANCE":
                        // Use distance in meters (or convert based on unit)
                        autoValue = Math.round(activity.distance);
                        break;
                      case "REPS":
                      case "TIMED_REPS":
                        // Can't auto-fill reps from Strava
                        break;
                    }
                    
                    if (autoValue !== null) {
                      setAchievedValue(String(autoValue));
                    }
                  }
                }}
                trigger={
                  <div className="p-8 rounded-lg border-2 border-dashed hover:border-[#FC4C02] transition-colors cursor-pointer text-center">
                    <svg className="h-10 w-10 mx-auto mb-2" viewBox="0 0 24 24" fill="#FC4C02">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                    </svg>
                    <p className="font-medium">Select Strava Activity</p>
                    <p className="text-sm text-muted-foreground">
                      Choose from your recent activities
                    </p>
                  </div>
                }
              />
            )}

            {/* Activity requirements hint */}
            {(challenge.activityType || (challenge.minDistance !== null && challenge.minDistance > 0) || (challenge.minElevationGain !== null && challenge.minElevationGain > 0) || challenge.requiresGPS || challenge.requiresHeartRate) && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-medium mb-1">Activity Requirements:</p>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  {challenge.activityType && (
                    <li>• Activity type: {challenge.activityType}</li>
                  )}
                  {challenge.minDistance !== null && challenge.minDistance > 0 && (
                    <li>• Minimum distance: {(challenge.minDistance / 1000).toFixed(1)} km</li>
                  )}
                  {challenge.maxDistance !== null && challenge.maxDistance > 0 && (
                    <li>• Maximum distance: {(challenge.maxDistance / 1000).toFixed(1)} km</li>
                  )}
                  {challenge.minElevationGain !== null && challenge.minElevationGain > 0 && (
                    <li>• Minimum elevation gain: {challenge.minElevationGain}m</li>
                  )}
                  {challenge.requiresGPS && <li>• GPS data required</li>}
                  {challenge.requiresHeartRate && <li>• Heart rate data required</li>}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Garmin - Coming Soon */}
      {proofType === "GARMIN" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Garmin Activity *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-8 rounded-lg border-2 border-dashed text-center">
              <Zap className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                Garmin integration is under development
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achieved Value (for graded challenges) */}
      {isGraded && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Result *</CardTitle>
            <CardDescription>
              {proofType === "STRAVA" && stravaActivity && (challenge.gradingType === "TIME" || challenge.gradingType === "DISTANCE")
                ? "Auto-filled from your Strava activity."
                : `Enter your achieved ${challenge.gradingUnit || "value"}. This will be verified during review.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show formatted time/distance from Strava if applicable */}
            {proofType === "STRAVA" && stravaActivity && challenge.gradingType === "TIME" && (
              <div className="p-3 rounded-lg bg-[#FC4C02]/10 border border-[#FC4C02]/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#FC4C02]" />
                  <span className="font-medium">Time from Strava:</span>
                  <span className="text-lg font-bold">{stravaActivity.movingTimeFormatted}</span>
                  <span className="text-muted-foreground text-sm">({stravaActivity.movingTime} seconds)</span>
                </div>
              </div>
            )}
            
            {proofType === "STRAVA" && stravaActivity && challenge.gradingType === "DISTANCE" && (
              <div className="p-3 rounded-lg bg-[#FC4C02]/10 border border-[#FC4C02]/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#FC4C02]" />
                  <span className="font-medium">Distance from Strava:</span>
                  <span className="text-lg font-bold">{stravaActivity.distanceKm} km</span>
                  <span className="text-muted-foreground text-sm">({Math.round(stravaActivity.distance)}m)</span>
                </div>
              </div>
            )}

            {/* Manual input - hidden for Strava TIME/DISTANCE, shown for others */}
            {!(proofType === "STRAVA" && stravaActivity && (challenge.gradingType === "TIME" || challenge.gradingType === "DISTANCE")) && (
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
            )}

            {/* Tier Targets Reference */}
            {grades.length > 0 && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-2">Tier Targets:</p>
                <div className="flex flex-wrap gap-2">
                  {grades.sort((a, b) => a.targetValue - b.targetValue).map(g => {
                    // Format the target value appropriately for TIME challenges
                    const displayValue = challenge.gradingType === "TIME" && challenge.timeFormat
                      ? formatSecondsToTime(g.targetValue, challenge.timeFormat as TimeFormat)
                      : g.targetValue;
                    return (
                      <Badge 
                        key={g.rank} 
                        variant={potentialTier === g.rank ? "default" : "outline"}
                        className="text-xs"
                      >
                        {g.rank}: {displayValue}+ {challenge.gradingType !== "TIME" ? (challenge.gradingUnit || "") : ""}
                      </Badge>
                    );
                  })}
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

      {/* Privacy Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Privacy Settings</CardTitle>
          <CardDescription>
            Control who can see your submission and what details are visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <div>
              <Label htmlFor="isPublic" className="font-medium cursor-pointer">
                Show on public feed & leaderboards
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, your submission may appear in the activity feed and leaderboards.
              </p>
            </div>
          </div>

          {isGraded && (
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="hideExactValue"
                checked={hideExactValue}
                onChange={(e) => setHideExactValue(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <div>
                <Label htmlFor="hideExactValue" className="font-medium cursor-pointer">
                  Hide exact {challenge.gradingType === "TIME" ? "time" : challenge.gradingUnit || "result"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Others will see your rank (e.g., "A-tier") but not your exact {challenge.gradingType === "TIME" ? "time" : challenge.gradingUnit || "value"}.
                </p>
              </div>
            </div>
          )}
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
