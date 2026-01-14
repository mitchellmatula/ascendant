/**
 * XP System Constants and Calculations
 * 
 * Design principles:
 * 1. XP is awarded per TIER (F, E, D, C, B, A, S), not per challenge
 * 2. Each tier can only be claimed ONCE per challenge per athlete
 * 3. Higher tiers award more XP
 * 4. XP required per rank doubles as you progress
 * 5. Graded challenges award XP for ALL tiers up to achieved tier
 * 6. Pass/Fail challenges award a flat amount based on their min/max rank
 */

import { db } from "./db";
import { RANKS, type Rank, RANK_INDEX, toNumericLevel, fromNumericLevel } from "./levels";

// Re-export constants from xp-constants for backward compatibility
export { 
  XP_PER_SUBLEVEL, 
  XP_PER_RANK, 
  CUMULATIVE_XP_TO_RANK, 
  XP_PER_TIER, 
  getPassFailXP 
} from "./xp-constants";

// Import for local use
import { XP_PER_SUBLEVEL, XP_PER_RANK, CUMULATIVE_XP_TO_RANK, XP_PER_TIER } from "./xp-constants";

// ============================================
// TIER CALCULATION FUNCTIONS
// ============================================

/**
 * Get all ranks between min and max (inclusive)
 */
export function getRanksInRange(minRank: Rank, maxRank: Rank): Rank[] {
  const minIndex = RANK_INDEX[minRank];
  const maxIndex = RANK_INDEX[maxRank];
  return RANKS.slice(minIndex, maxIndex + 1) as Rank[];
}

/**
 * Determine which tier an athlete achieved based on their performance
 * Returns null if they didn't meet the minimum tier
 */
export function calculateAchievedTier(
  achievedValue: number,
  gradeTargets: Array<{ rank: string; targetValue: number }>,
  gradingType: string
): Rank | null {
  if (!gradeTargets.length) return null;

  // Sort by target value (ascending for REPS/DISTANCE, descending for TIME)
  const isTimeBasedLower = gradingType === "TIME"; // For time, lower is better
  const sortedGrades = [...gradeTargets].sort((a, b) => 
    isTimeBasedLower ? b.targetValue - a.targetValue : a.targetValue - b.targetValue
  );

  let achievedRank: Rank | null = null;

  for (const grade of sortedGrades) {
    const meetsTarget = isTimeBasedLower
      ? achievedValue <= grade.targetValue // For time: need to be faster (lower)
      : achievedValue >= grade.targetValue; // For reps/distance: need to be higher

    if (meetsTarget) {
      achievedRank = grade.rank as Rank;
    }
  }

  return achievedRank;
}

/**
 * Calculate which tiers would be newly claimed
 * Returns only tiers not already in claimedTiers
 */
export function getNewTiersToClaim(
  achievedRank: Rank,
  minRank: Rank,
  claimedTiers: string // comma-separated, e.g., "F,E,D"
): Rank[] {
  const alreadyClaimed = new Set(claimedTiers.split(",").filter(Boolean));
  const eligibleRanks = getRanksInRange(minRank, achievedRank);
  
  return eligibleRanks.filter(rank => !alreadyClaimed.has(rank));
}

/**
 * Calculate total XP for claiming a set of tiers
 */
export function calculateTierXP(tiers: Rank[]): number {
  return tiers.reduce((total, tier) => total + XP_PER_TIER[tier], 0);
}

/**
 * Full XP calculation for a graded challenge submission
 */
export function calculateSubmissionXP(
  achievedValue: number,
  gradeTargets: Array<{ rank: string; targetValue: number; divisionId: string }>,
  divisionId: string,
  minRank: Rank,
  gradingType: string,
  existingClaimedTiers: string
): {
  achievedRank: Rank | null;
  newTiers: Rank[];
  xpAwarded: number;
  updatedClaimedTiers: string;
} {
  // Filter grades for this division
  const divisionGrades = gradeTargets.filter(g => g.divisionId === divisionId);
  
  // Calculate which tier they achieved
  const achievedRank = calculateAchievedTier(achievedValue, divisionGrades, gradingType);
  
  if (!achievedRank) {
    return {
      achievedRank: null,
      newTiers: [],
      xpAwarded: 0,
      updatedClaimedTiers: existingClaimedTiers,
    };
  }

  // Get new tiers to claim
  const newTiers = getNewTiersToClaim(achievedRank, minRank, existingClaimedTiers);
  
  // Calculate XP for new tiers
  const xpAwarded = calculateTierXP(newTiers);
  
  // Build updated claimed tiers string
  const existingSet = new Set(existingClaimedTiers.split(",").filter(Boolean));
  newTiers.forEach(tier => existingSet.add(tier));
  const updatedClaimedTiers = RANKS.filter(r => existingSet.has(r)).join(",");

  return {
    achievedRank,
    newTiers,
    xpAwarded,
    updatedClaimedTiers,
  };
}

/**
 * Check if an athlete can still earn XP from a challenge
 * Returns false if all available tiers are already claimed
 */
export function canEarnMoreXP(
  claimedTiers: string,
  maxRank: Rank,
  minRank: Rank
): boolean {
  const claimed = new Set(claimedTiers.split(",").filter(Boolean));
  const availableRanks = getRanksInRange(minRank, maxRank);
  return availableRanks.some(rank => !claimed.has(rank));
}

/**
 * Calculate XP needed to reach the next sublevel
 */
export function xpToNextSublevel(
  currentRank: Rank,
  currentSublevel: number,
  currentXP: number
): number {
  // XP needed per sublevel for this rank
  const xpPerSublevel = XP_PER_SUBLEVEL[currentRank];
  
  // How much XP have we "used" for completed sublevels?
  const xpUsedForSublevels = currentSublevel * xpPerSublevel;
  
  // XP needed for next sublevel
  const targetXP = (currentSublevel + 1) * xpPerSublevel;
  
  return Math.max(0, targetXP - currentXP);
}

/**
 * Calculate total XP required to reach a specific rank and sublevel
 */
export function totalXPForLevel(rank: Rank, sublevel: number): number {
  return CUMULATIVE_XP_TO_RANK[rank] + (sublevel * XP_PER_SUBLEVEL[rank]);
}

/**
 * Calculate level from cumulative XP
 */
export function calculateLevelFromXP(totalXP: number): { letter: Rank; sublevel: number } {
  // Find which rank we're in
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const rank = RANKS[i];
    if (totalXP >= CUMULATIVE_XP_TO_RANK[rank]) {
      const xpIntoRank = totalXP - CUMULATIVE_XP_TO_RANK[rank];
      const sublevel = Math.min(9, Math.floor(xpIntoRank / XP_PER_SUBLEVEL[rank]));
      return { letter: rank, sublevel };
    }
  }
  return { letter: "F", sublevel: 0 };
}

/**
 * Award XP to an athlete for a specific domain
 */
export async function awardXP(params: {
  athleteId: string;
  domainId: string;
  amount: number;
  source: "CHALLENGE" | "TRAINING" | "COMPETITION" | "EVENT" | "BONUS" | "ADMIN";
  sourceId?: string;
  note?: string;
}) {
  const { athleteId, domainId, amount, source, sourceId, note } = params;

  // Create XP transaction
  await db.xPTransaction.create({
    data: {
      athleteId,
      domainId,
      amount,
      source,
      sourceId,
      note,
    },
  });

  // Update domain level
  const domainLevel = await db.domainLevel.upsert({
    where: {
      athleteId_domainId: {
        athleteId,
        domainId,
      },
    },
    create: {
      athleteId,
      domainId,
      currentXP: amount,
      letter: "F",
      sublevel: 0,
    },
    update: {
      currentXP: {
        increment: amount,
      },
    },
  });

  // Recalculate level based on new XP
  const newXP = domainLevel.currentXP + (domainLevel.id ? 0 : amount); // If created, amount already included
  const newLevel = calculateLevelFromXP(newXP);
  
  // Update if level changed (respecting breakthrough system - only update sublevel within same letter)
  if (newLevel.letter === domainLevel.letter && newLevel.sublevel > domainLevel.sublevel) {
    await db.domainLevel.update({
      where: { id: domainLevel.id },
      data: { sublevel: newLevel.sublevel },
    });
  } else if (toNumericLevel(newLevel.letter, newLevel.sublevel) > toNumericLevel(domainLevel.letter as Rank, domainLevel.sublevel)) {
    // XP exceeds current letter - bank it for breakthrough
    const currentLetterMaxXP = CUMULATIVE_XP_TO_RANK[domainLevel.letter as Rank] + XP_PER_RANK[domainLevel.letter as Rank];
    const bankedAmount = newXP - currentLetterMaxXP;
    
    if (bankedAmount > 0) {
      await db.domainLevel.update({
        where: { id: domainLevel.id },
        data: {
          sublevel: 9, // Cap at x9
          bankedXP: { increment: bankedAmount },
        },
      });
    }
  }

  return domainLevel;
}

/**
 * Get XP history for an athlete in a domain
 */
export async function getXPHistory(athleteId: string, domainId?: string) {
  return db.xPTransaction.findMany({
    where: {
      athleteId,
      ...(domainId && { domainId }),
    },
    include: {
      domain: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}
