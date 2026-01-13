import { z } from "zod";

export const createChallengeSchema = z.object({
  categoryId: z.string().cuid(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters"),
  instructions: z.string().optional(),
  demoVideoUrl: z.string().url().optional().or(z.literal("")),
  demoImageUrl: z.string().url().optional().or(z.literal("")),
  baseXP: z.number().int().min(1).max(10000).default(100),
  difficulty: z.number().int().min(1).max(10).default(1),
  isActive: z.boolean().default(true),
});

export const updateChallengeSchema = createChallengeSchema.partial();

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
