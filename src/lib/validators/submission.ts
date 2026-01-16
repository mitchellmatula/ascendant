import { z } from "zod";

// Proof type enum
const proofTypeEnum = z.enum(["VIDEO", "IMAGE", "STRAVA", "GARMIN", "RACE_RESULT", "MANUAL"]);

// Create a new submission
export const createSubmissionSchema = z.object({
  athleteId: z.string().cuid().optional(), // Optional now - will use active athlete if not provided
  challengeId: z.string().cuid(),
  proofType: proofTypeEnum.default("VIDEO"),
  
  // Traditional proof
  videoUrl: z.string().url().optional().nullable().or(z.literal("")),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
  
  // Strava activity proof
  stravaActivityId: z.string().optional(),
  stravaActivityUrl: z.string().url().optional(),
  
  // Garmin activity proof
  garminActivityId: z.string().optional(),
  garminActivityUrl: z.string().url().optional(),
  
  // Cached activity metrics (from Strava/Garmin API)
  activityDistance: z.number().positive().optional(), // Distance in meters
  activityTime: z.number().int().positive().optional(), // Duration in seconds
  activityElevation: z.number().positive().optional(), // Elevation gain in meters
  activityType: z.string().optional(), // Run, Ride, Swim, etc.
  activityDate: z.string().datetime().optional(), // When the activity occurred
  activityAvgHR: z.number().int().positive().optional(), // Average heart rate
  activityMaxHR: z.number().int().positive().optional(), // Max heart rate
  
  // For graded challenges (reps, time, etc.)
  achievedValue: z.number().positive().optional().nullable(),
  
  // Privacy settings
  isPublic: z.boolean().default(true), // Show on public feeds/leaderboards
  hideExactValue: z.boolean().default(false), // Hide achievedValue but still show rank
  
  // Manual entry supervisor (required for MANUAL proof type)
  supervisorId: z.string().cuid().optional(), // User ID of supervising coach
  supervisorName: z.string().optional(), // Cached name for display
}).refine(
  (data) => {
    // Validate that appropriate proof is provided based on proofType
    switch (data.proofType) {
      case "VIDEO":
        return !!data.videoUrl;
      case "IMAGE":
        return !!data.imageUrl;
      case "STRAVA":
        return !!data.stravaActivityId;
      case "GARMIN":
        return !!data.garminActivityId;
      case "RACE_RESULT":
        return !!data.imageUrl || !!data.videoUrl; // Usually an image of the result
      case "MANUAL":
        return !!data.supervisorId; // Requires supervisor selection
      default:
        return false;
    }
  },
  { message: "Proof is required for the selected proof type", path: ["proofType"] }
);

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

// Review a submission
export const reviewSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "NEEDS_REVISION"]),
  reviewNotes: z.string().max(2000).optional(),
  achievedValue: z.number().int().positive().optional().nullable(), // Reviewer can adjust/set the achieved value
});

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

// Query submissions (for listing/filtering)
export const submissionQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION", "ALL"]).optional(),
  athleteId: z.string().optional(),
  challengeId: z.string().optional(),
  domainId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SubmissionQueryInput = z.infer<typeof submissionQuerySchema>;
