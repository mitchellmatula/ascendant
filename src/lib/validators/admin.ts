import { z } from "zod";
import { RANKS } from "../levels";

// Domain validators
export const createDomainSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateDomainSchema = createDomainSchema.partial();

// Category validators
export const createCategorySchema = z.object({
  domainId: z.string().cuid(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

// Division validators
export const createDivisionSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  gender: z.enum(["male", "female"]).optional().nullable(),
  ageMin: z.number().int().min(0).max(120).optional().nullable(),
  ageMax: z.number().int().min(0).max(120).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.ageMin !== null && data.ageMax !== null && data.ageMin !== undefined && data.ageMax !== undefined) {
      return data.ageMin <= data.ageMax;
    }
    return true;
  },
  { message: "Minimum age must be less than or equal to maximum age", path: ["ageMin"] }
);

export const updateDivisionSchema = createDivisionSchema.partial();

// XP Threshold validators
export const createXPThresholdSchema = z.object({
  domainId: z.string().cuid(),
  rank: z.enum(RANKS as unknown as [string, ...string[]]),
  sublevel: z.number().int().min(0).max(9),
  xpRequired: z.number().int().min(0),
});

export const updateXPThresholdSchema = createXPThresholdSchema.partial();

// Rank Requirement validators
export const createRankRequirementSchema = z.object({
  challengeId: z.string().cuid(),
  divisionId: z.string().cuid(),
  requiredForRank: z.enum(RANKS as unknown as [string, ...string[]]),
  bonusXP: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
});

export const updateRankRequirementSchema = createRankRequirementSchema.partial();

// Rank Threshold validators
export const createRankThresholdSchema = z.object({
  divisionId: z.string().cuid(),
  domainId: z.string().cuid(),
  rank: z.enum(RANKS as unknown as [string, ...string[]]),
  categoryId: z.string().cuid().optional().nullable(),
  requiredCount: z.number().int().min(1),
  totalInCategory: z.number().int().min(1).optional().nullable(),
});

export const updateRankThresholdSchema = createRankThresholdSchema.partial();

// Type exports
export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type UpdateDomainInput = z.infer<typeof updateDomainSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateDivisionInput = z.infer<typeof createDivisionSchema>;
export type UpdateDivisionInput = z.infer<typeof updateDivisionSchema>;
export type CreateXPThresholdInput = z.infer<typeof createXPThresholdSchema>;
export type UpdateXPThresholdInput = z.infer<typeof updateXPThresholdSchema>;
export type CreateRankRequirementInput = z.infer<typeof createRankRequirementSchema>;
export type UpdateRankRequirementInput = z.infer<typeof updateRankRequirementSchema>;
export type CreateRankThresholdInput = z.infer<typeof createRankThresholdSchema>;
export type UpdateRankThresholdInput = z.infer<typeof updateRankThresholdSchema>;
