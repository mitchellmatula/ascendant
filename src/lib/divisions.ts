/**
 * Division matching utilities
 */

import { db } from "./db";

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if an athlete is a minor (under 18)
 */
export function isMinor(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) < 18;
}

/**
 * Find the matching division for an athlete based on age and gender
 */
export async function findMatchingDivision(dateOfBirth: Date, gender: string) {
  const age = calculateAge(dateOfBirth);

  // Find all active divisions that match
  const divisions = await db.division.findMany({
    where: {
      isActive: true,
      OR: [
        { gender: null }, // Gender-neutral divisions
        { gender: gender },
      ],
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  // Find the most specific matching division
  for (const division of divisions) {
    const ageMatches =
      (division.ageMin === null || age >= division.ageMin) &&
      (division.ageMax === null || age <= division.ageMax);
    
    const genderMatches = division.gender === null || division.gender === gender;

    if (ageMatches && genderMatches) {
      return division;
    }
  }

  return null;
}

/**
 * Get all divisions for admin management
 */
export async function getAllDivisions() {
  return db.division.findMany({
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    include: {
      _count: {
        select: {
          rankRequirements: true,
          rankThresholds: true,
        },
      },
    },
  });
}

/**
 * Format age range for display
 */
export function formatAgeRange(ageMin: number | null, ageMax: number | null): string {
  if (ageMin === null && ageMax === null) {
    return "All ages";
  }
  if (ageMin === null) {
    return `Under ${ageMax! + 1}`;
  }
  if (ageMax === null) {
    return `${ageMin}+`;
  }
  return `${ageMin}-${ageMax}`;
}
