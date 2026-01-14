import { z } from "zod";

// Create a new submission
export const createSubmissionSchema = z.object({
  athleteId: z.string().cuid(),
  challengeId: z.string().cuid(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  achievedValue: z.number().int().positive().optional().nullable(), // For graded challenges (reps, time, etc.)
}).refine(
  (data) => data.videoUrl || data.imageUrl,
  { message: "Either a video or image is required", path: ["videoUrl"] }
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
