"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VideoDisplay } from "@/components/ui/video-display";
import { Check, X, RotateCcw, Loader2 } from "lucide-react";

type Submission = {
  id: string;
  videoUrl: string | null;
  imageUrl: string | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  achievedValue: number | null;
  achievedRank: string | null;
  submittedAt: string;
  athlete: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  challenge: {
    id: string;
    name: string;
    slug: string;
    gradingType: string;
    gradingUnit: string | null;
    primaryDomain: {
      name: string;
      icon: string | null;
      color: string | null;
    };
  };
};

interface ReviewDialogProps {
  submission: Submission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete: () => void;
}

export function ReviewDialog({
  submission,
  open,
  onOpenChange,
  onReviewComplete,
}: ReviewDialogProps) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [achievedValue, setAchievedValue] = useState<string>(
    submission.achievedValue?.toString() || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(status: "APPROVED" | "REJECTED" | "NEEDS_REVISION") {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/submissions/${submission.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNotes || null,
          achievedValue: achievedValue ? parseInt(achievedValue) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }

      onReviewComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const isGraded = submission.challenge.gradingType !== "PASS_FAIL";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>
            {submission.athlete.displayName} submitted {submission.challenge.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Submission Media */}
          <div className="rounded-lg overflow-hidden bg-muted aspect-video">
            {submission.videoUrl ? (
              <VideoDisplay
                url={submission.videoUrl}
                fallbackImageUrl={submission.imageUrl}
              />
            ) : submission.imageUrl ? (
              <img
                src={submission.imageUrl}
                alt="Submission"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No media attached
              </div>
            )}
          </div>

          {/* Submission Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Challenge</Label>
              <p className="font-medium">{submission.challenge.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Domain</Label>
              <p className="font-medium">
                {submission.challenge.primaryDomain.icon} {submission.challenge.primaryDomain.name}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Grading Type</Label>
              <p className="font-medium capitalize">
                {submission.challenge.gradingType.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
            {submission.achievedRank && (
              <div>
                <Label className="text-muted-foreground">Current Tier</Label>
                <Badge className="mt-1">{submission.achievedRank}-Tier</Badge>
              </div>
            )}
          </div>

          {/* Athlete Notes */}
          {submission.notes && (
            <div>
              <Label className="text-muted-foreground">Athlete Notes</Label>
              <p className="text-sm bg-muted p-3 rounded-lg mt-1">{submission.notes}</p>
            </div>
          )}

          {/* Graded Value Input */}
          {isGraded && submission.status === "PENDING" && (
            <div>
              <Label htmlFor="achievedValue">
                Achieved Value ({submission.challenge.gradingUnit || "units"})
              </Label>
              <Input
                id="achievedValue"
                type="number"
                value={achievedValue}
                onChange={(e) => setAchievedValue(e.target.value)}
                placeholder={`Enter ${submission.challenge.gradingUnit || "value"}`}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the value you observed (e.g., number of reps, seconds, distance)
              </p>
            </div>
          )}

          {/* Review Notes */}
          {submission.status === "PENDING" && (
            <div>
              <Label htmlFor="reviewNotes">Feedback / Notes</Label>
              <Textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Provide feedback to the athlete (required for rejections)"
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {submission.status === "PENDING" ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={() => handleReview("NEEDS_REVISION")}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Request Revision
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview("REJECTED")}
                disabled={submitting || !reviewNotes.trim()}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleReview("APPROVED")}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
