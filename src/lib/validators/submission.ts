import { z } from "zod";

export const createSubmissionSchema = z.object({
  athleteId: z.string().cuid(),
  challengeId: z.string().cuid(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.videoUrl || data.imageUrl,
  { message: "Either a video or image is required", path: ["videoUrl"] }
);

export const reviewSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "NEEDS_REVISION"]),
  reviewNotes: z.string().max(1000).optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
