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
 * Handles breakthrough gating - XP is banked if athlete needs to breakthrough
 */
export async function awardXP(params: {
  athleteId: string;
  domainId: string;
  amount: number;
  source: "CHALLENGE" | "TRAINING" | "COMPETITION" | "EVENT" | "BONUS" | "ADMIN";
  sourceId?: string;
  note?: string;
}): Promise<{
  domainLevel: { 
    id: string; 
    letter: string; 
    sublevel: number; 
    currentXP: number;
    bankedXP: number;
    breakthroughReady: boolean;
  };
  leveledUp: boolean;
  previousLevel: { letter: string; sublevel: number };
  newLevel: { letter: string; sublevel: number };
  breakthroughRequired: boolean;
  xpAwarded: number;
}> {
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

  // Get or create domain level
  let domainLevel = await db.domainLevel.findUnique({
    where: {
      athleteId_domainId: {
        athleteId,
        domainId,
      },
    },
  });
  
  // Store previous level for comparison
  const previousLevel = {
    letter: domainLevel?.letter ?? "F",
    sublevel: domainLevel?.sublevel ?? 0,
  };

  if (!domainLevel) {
    domainLevel = await db.domainLevel.create({
      data: {
        athleteId,
        domainId,
        currentXP: 0,
        letter: "F",
        sublevel: 0,
        bankedXP: 0,
        breakthroughReady: false,
      },
    });
  }

  const currentRank = domainLevel.letter as Rank;
  const xpPerSublevel = XP_PER_SUBLEVEL[currentRank];
  const maxXPForRank = XP_PER_RANK[currentRank]; // Total XP to complete this rank

  // Calculate new XP total
  const newCurrentXP = domainLevel.currentXP + amount;
  
  // Calculate how many sublevels this XP represents
  const potentialSublevel = Math.floor(newCurrentXP / xpPerSublevel);
  
  let newSublevel = domainLevel.sublevel;
  let newBankedXP = domainLevel.bankedXP;
  let breakthroughReady = domainLevel.breakthroughReady;
  let leveledUp = false;

  if (potentialSublevel > domainLevel.sublevel) {
    // We can level up within this rank
    if (potentialSublevel <= 9) {
      // Normal sublevel advancement
      newSublevel = potentialSublevel;
      leveledUp = true;
    } else {
      // Hit the rank ceiling (sublevel 9) - need breakthrough
      newSublevel = 9;
      leveledUp = domainLevel.sublevel < 9;
      
      // Bank any excess XP beyond what's needed for sublevel 9
      const xpFor9 = 9 * xpPerSublevel;
      const excessXP = newCurrentXP - xpFor9;
      
      if (excessXP > 0) {
        newBankedXP = domainLevel.bankedXP + excessXP;
        breakthroughReady = true;
      }
    }
  }

  // Check if we're at sublevel 9 and have max XP
  if (newSublevel === 9 && newCurrentXP >= maxXPForRank) {
    breakthroughReady = true;
  }

  // Update domain level
  const updatedLevel = await db.domainLevel.update({
    where: { id: domainLevel.id },
    data: {
      currentXP: Math.min(newCurrentXP, maxXPForRank), // Cap at max for rank
      sublevel: newSublevel,
      bankedXP: newBankedXP,
      breakthroughReady,
    },
  });

  return {
    domainLevel: updatedLevel,
    leveledUp,
    previousLevel,
    newLevel: { letter: updatedLevel.letter, sublevel: updatedLevel.sublevel },
    breakthroughRequired: breakthroughReady,
    xpAwarded: amount,
  };
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
