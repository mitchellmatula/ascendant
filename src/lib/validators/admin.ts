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

// Division validators - base schema without refinement for partial()
const divisionBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  // Gender can be "male", "female", null, or undefined (for open divisions)
  gender: z.enum(["male", "female"]).nullable().optional(),
  ageMin: z.number().int().min(0).max(120).nullable().optional(),
  ageMax: z.number().int().min(0).max(120).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

// Add refinement for create (full validation)
export const createDivisionSchema = divisionBaseSchema.refine(
  (data) => {
    if (data.ageMin !== null && data.ageMax !== null && data.ageMin !== undefined && data.ageMax !== undefined) {
      return data.ageMin <= data.ageMax;
    }
    return true;
  },
  { message: "Minimum age must be less than or equal to maximum age", path: ["ageMin"] }
);

// Use base schema for partial (update)
export const updateDivisionSchema = divisionBaseSchema.partial();

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

// Discipline validators
export const createDisciplineSchema = z.object({
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

export const updateDisciplineSchema = createDisciplineSchema.partial();

// Equipment validators
export const createEquipmentSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  imageUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  disciplineIds: z.array(z.string().cuid()).optional().default([]),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

// Grading type enum (matches Prisma)
export const gradingTypes = ["PASS_FAIL", "REPS", "TIME", "DISTANCE", "TIMED_REPS", "WEIGHTED_REPS"] as const;
export type GradingType = typeof gradingTypes[number];

// Time format for TIME-based challenges
export const timeFormats = ["seconds", "mm:ss", "hh:mm:ss"] as const;
export type TimeFormat = typeof timeFormats[number];

// Proof types for challenge submissions
export const proofTypes = ["VIDEO", "IMAGE", "STRAVA", "MANUAL"] as const;
export type ProofType = typeof proofTypes[number];

// Activity types for Strava validation
export const activityTypes = [
  "Run", "Trail Run", "Ride", "Mountain Bike", "Swim", "Open Water Swim",
  "Walk", "Hike", "Row", "Kayak", "Cross-Country Ski", "Other"
] as const;
export type ActivityType = typeof activityTypes[number];

// Challenge Grade validators (per division/rank requirements)
export const challengeGradeSchema = z.object({
  divisionId: z.string().cuid(),
  rank: z.enum(RANKS as unknown as [string, ...string[]]),
  targetValue: z.number().int().min(0),
  targetWeight: z.number().int().min(0).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  bonusXP: z.number().int().min(0).default(0),
});

// Challenge validators
const challengeBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  instructions: z.string().optional().nullable(),
  demoVideoUrl: z.string().url().optional().nullable(),
  demoImageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
  
  // Grading configuration
  gradingType: z.enum(gradingTypes).default("PASS_FAIL"),
  gradingUnit: z.string().max(20).optional().nullable(), // e.g., "reps", "seconds", "meters"
  weightUnit: z.enum(["lbs", "kg"]).optional().nullable(), // For WEIGHTED_REPS: weight unit
  timeFormat: z.enum(timeFormats).optional().nullable(), // For TIME type: display format
  minRank: z.enum(RANKS as unknown as [string, ...string[]]).default("F"),
  maxRank: z.enum(RANKS as unknown as [string, ...string[]]).default("S"),
  
  // Proof types & activity validation (Strava integration)
  proofTypes: z.array(z.enum(proofTypes)).min(1, "At least one proof type is required").default(["VIDEO"]),
  activityType: z.string().max(50).optional().nullable(), // Run, Ride, Swim, etc.
  minDistance: z.number().min(0).optional().nullable(), // meters
  maxDistance: z.number().min(0).optional().nullable(), // meters
  minElevationGain: z.number().min(0).optional().nullable(), // meters
  requiresGPS: z.boolean().default(false), // Must be outdoor GPS activity
  requiresHeartRate: z.boolean().default(false), // Must have HR data
  
  // Primary domain (required)
  primaryDomainId: z.string().cuid("Primary domain is required"),
  primaryXPPercent: z.number().int().min(50).max(100).default(100),
  
  // Secondary domain (optional)
  secondaryDomainId: z.string().cuid().optional().nullable(),
  secondaryXPPercent: z.number().int().min(0).max(50).optional().nullable(),
  
  // Tertiary domain (optional)
  tertiaryDomainId: z.string().cuid().optional().nullable(),
  tertiaryXPPercent: z.number().int().min(0).max(30).optional().nullable(),
  
  // Many-to-many relationships (arrays of IDs)
  categoryIds: z.array(z.string().cuid()).min(1, "At least one category is required"),
  disciplineIds: z.array(z.string().cuid()).optional().default([]),
  equipmentIds: z.array(z.string().cuid()).optional().default([]),
  
  // Graded requirements per division/rank
  grades: z.array(challengeGradeSchema).optional().default([]),
  
  // Gym-specific challenge (optional - null for global challenges)
  gymId: z.string().cuid().optional().nullable(),
  
  // Allowed divisions (optional - empty for all divisions)
  allowedDivisionIds: z.array(z.string().cuid()).optional().default([]),
});

// Add refinement for XP percentage validation
export const createChallengeSchema = challengeBaseSchema.refine(
  (data) => {
    const primary = data.primaryXPPercent ?? 100;
    const secondary = data.secondaryXPPercent ?? 0;
    const tertiary = data.tertiaryXPPercent ?? 0;
    return primary + secondary + tertiary === 100;
  },
  { message: "XP percentages must sum to 100%", path: ["primaryXPPercent"] }
).refine(
  (data) => {
    // If secondary domain is set, percentage must be > 0
    if (data.secondaryDomainId && (!data.secondaryXPPercent || data.secondaryXPPercent === 0)) {
      return false;
    }
    return true;
  },
  { message: "Secondary domain requires an XP percentage", path: ["secondaryXPPercent"] }
).refine(
  (data) => {
    // If tertiary domain is set, percentage must be > 0
    if (data.tertiaryDomainId && (!data.tertiaryXPPercent || data.tertiaryXPPercent === 0)) {
      return false;
    }
    return true;
  },
  { message: "Tertiary domain requires an XP percentage", path: ["tertiaryXPPercent"] }
).refine(
  (data) => {
    // Tertiary can only be set if secondary is set
    if (data.tertiaryDomainId && !data.secondaryDomainId) {
      return false;
    }
    return true;
  },
  { message: "Cannot set tertiary domain without secondary domain", path: ["tertiaryDomainId"] }
).refine(
  (data) => {
    // Validate min/max rank order
    const rankOrder = ["F", "E", "D", "C", "B", "A", "S"];
    const minIdx = rankOrder.indexOf(data.minRank ?? "F");
    const maxIdx = rankOrder.indexOf(data.maxRank ?? "S");
    return minIdx <= maxIdx;
  },
  { message: "Minimum rank must be less than or equal to maximum rank", path: ["minRank"] }
).refine(
  (data) => {
    // If grading type is not PASS_FAIL or TIME, require a unit
    // TIME type auto-generates its unit from the timeFormat
    if (data.gradingType && data.gradingType !== "PASS_FAIL" && data.gradingType !== "TIME" && !data.gradingUnit) {
      return false;
    }
    return true;
  },
  { message: "Grading unit is required for this grading type", path: ["gradingUnit"] }
);

// For updates, make everything optional but still validate percentages if provided
export const updateChallengeSchema = challengeBaseSchema.partial();

// Gym validators
export const gymRoles = ["MEMBER", "COACH", "MANAGER", "OWNER"] as const;
export type GymRole = typeof gymRoles[number];

export const createGymSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  googlePlaceId: z.string().max(300).optional().nullable(), // Google Places API place_id
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  instagramUrl: z.string().url().optional().nullable(),
  facebookUrl: z.string().url().optional().nullable(),
  tiktokUrl: z.string().url().optional().nullable(),
  youtubeUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
  disciplineIds: z.array(z.string().cuid()).optional().default([]),
  equipmentIds: z.array(z.string().cuid()).optional().default([]),
});

export const updateGymSchema = createGymSchema.partial();

// Gym member validators
export const addGymMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(gymRoles).default("MEMBER"),
});

export const updateGymMemberSchema = z.object({
  role: z.enum(gymRoles),
  isActive: z.boolean().optional(),
});

// User validators
export const roles = ["ATHLETE", "PARENT", "COACH", "GYM_ADMIN", "SYSTEM_ADMIN"] as const;
export const accountTypes = ["ATHLETE", "PARENT"] as const;

const athleteProfileSchema = z.object({
  id: z.string().cuid().optional(), // For existing athletes
  displayName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().optional(), // ISO string
  gender: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
  disciplineIds: z.array(z.string().cuid()).optional(),
});

export const updateUserSchema = z.object({
  role: z.enum(roles).optional(),
  accountType: z.enum(accountTypes).optional(),
  athlete: athleteProfileSchema.optional(),
  managedAthletes: z.array(athleteProfileSchema).optional(),
});

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
export type CreateDisciplineInput = z.infer<typeof createDisciplineSchema>;
export type UpdateDisciplineInput = z.infer<typeof updateDisciplineSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type ChallengeGradeInput = z.infer<typeof challengeGradeSchema>;
export type CreateGymInput = z.infer<typeof createGymSchema>;
export type UpdateGymInput = z.infer<typeof updateGymSchema>;
export type AddGymMemberInput = z.infer<typeof addGymMemberSchema>;
export type UpdateGymMemberInput = z.infer<typeof updateGymMemberSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Equipment Package validators
export const equipmentPackageItemSchema = z.object({
  equipmentId: z.string().cuid(),
  quantity: z.number().int().min(1).default(1),
});

export const createEquipmentPackageSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().max(1000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  items: z.array(equipmentPackageItemSchema).optional().default([]),
});

export const updateEquipmentPackageSchema = createEquipmentPackageSchema.partial();

export type EquipmentPackageItemInput = z.infer<typeof equipmentPackageItemSchema>;
export type CreateEquipmentPackageInput = z.infer<typeof createEquipmentPackageSchema>;
export type UpdateEquipmentPackageInput = z.infer<typeof updateEquipmentPackageSchema>;
