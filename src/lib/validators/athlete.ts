import { z } from "zod";

export const createAthleteSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be less than 50 characters"),
  dateOfBirth: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  gender: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Please select a gender" }),
  }),
});

export const updateAthleteSchema = createAthleteSchema.partial();

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>;
