/**
 * XP Calculation Utilities
 */

import { db } from "./db";
import type { Rank } from "./levels";
import { RANKS, toNumericLevel, fromNumericLevel } from "./levels";

/**
 * Calculate the XP required for a specific sublevel in a domain
 * Falls back to default if no custom threshold is set
 */
export async function getXPThreshold(
  domainId: string,
  rank: Rank,
  sublevel: number
): Promise<number> {
  const threshold = await db.xPThreshold.findUnique({
    where: {
      domainId_rank_sublevel: {
        domainId,
        rank,
        sublevel,
      },
    },
  });

  if (threshold) {
    return threshold.xpRequired;
  }

  // Default: 100 XP per sublevel, cumulative
  // F0 = 0, F1 = 100, F2 = 200, ... E0 = 1000, E1 = 1100, etc.
  const numericLevel = toNumericLevel(rank, sublevel);
  return numericLevel * 100;
}

/**
 * Get cumulative XP required to reach a specific level
 */
export async function getCumulativeXPForLevel(
  domainId: string,
  targetRank: Rank,
  targetSublevel: number
): Promise<number> {
  let totalXP = 0;
  
  for (const rank of RANKS) {
    for (let sublevel = 0; sublevel <= 9; sublevel++) {
      if (rank === targetRank && sublevel >= targetSublevel) {
        return totalXP;
      }
      totalXP += await getXPThreshold(domainId, rank, sublevel);
      
      // Early exit if we've passed the target
      const currentNumeric = toNumericLevel(rank, sublevel);
      const targetNumeric = toNumericLevel(targetRank, targetSublevel);
      if (currentNumeric >= targetNumeric) {
        return totalXP;
      }
    }
  }

  return totalXP;
}

/**
 * Calculate new level based on XP
 */
export function calculateLevelFromXP(
  currentXP: number,
  xpPerSublevel: number = 100
): { letter: Rank; sublevel: number } {
  const totalSublevels = Math.floor(currentXP / xpPerSublevel);
  return fromNumericLevel(totalSublevels);
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
  // For now, use simple calculation; later can use custom thresholds
  const newLevel = calculateLevelFromXP(domainLevel.currentXP + amount);
  
  // Update if level changed (respecting breakthrough system - only update sublevel within same letter)
  if (newLevel.letter === domainLevel.letter && newLevel.sublevel > domainLevel.sublevel) {
    await db.domainLevel.update({
      where: { id: domainLevel.id },
      data: { sublevel: newLevel.sublevel },
    });
  } else if (toNumericLevel(newLevel.letter, newLevel.sublevel) > toNumericLevel(domainLevel.letter as Rank, domainLevel.sublevel)) {
    // XP exceeds current letter - bank it for breakthrough
    const currentLetterMaxXP = (toNumericLevel(domainLevel.letter as Rank, 9) + 1) * 100;
    const bankedAmount = domainLevel.currentXP + amount - currentLetterMaxXP;
    
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
