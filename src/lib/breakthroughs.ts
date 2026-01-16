/**
 * Breakthrough System
 * 
 * Athletes must meet breakthrough requirements to advance from one rank letter to the next.
 * 
 * Requirements:
 * - Achieve at least [tierRequired] on [challengeCount] challenges in the domain
 * 
 * Example: To go from F → E in Strength, achieve E-tier on 3 Strength challenges
 * 
 * Default breakthrough requirements (can be overridden per division):
 * | From → To | Tier Required | Challenges |
 * |-----------|---------------|------------|
 * | F → E     | E-tier        | 3          |
 * | E → D     | D-tier        | 5          |
 * | D → C     | C-tier        | 7          |
 * | C → B     | B-tier        | 10         |
 * | B → A     | A-tier        | 12         |
 * | A → S     | S-tier        | 15         |
 */

import { db } from "./db";
import { RANKS, type Rank, RANK_INDEX, getNextRank } from "./levels";

// Default breakthrough requirements if no rules are configured
export const DEFAULT_BREAKTHROUGH_RULES: Array<{
  fromRank: Rank;
  toRank: Rank;
  tierRequired: Rank;
  challengeCount: number;
}> = [
  { fromRank: "F", toRank: "E", tierRequired: "E", challengeCount: 3 },
  { fromRank: "E", toRank: "D", tierRequired: "D", challengeCount: 5 },
  { fromRank: "D", toRank: "C", tierRequired: "C", challengeCount: 7 },
  { fromRank: "C", toRank: "B", tierRequired: "B", challengeCount: 10 },
  { fromRank: "B", toRank: "A", tierRequired: "A", challengeCount: 12 },
  { fromRank: "A", toRank: "S", tierRequired: "S", challengeCount: 15 },
];

export interface BreakthroughProgress {
  fromRank: Rank;
  toRank: Rank;
  tierRequired: Rank;
  challengeCount: number;
  currentProgress: number; // How many challenges athlete has at required tier
  isComplete: boolean;
  qualifyingChallenges: Array<{
    challengeId: string;
    challengeName: string;
    achievedTier: string;
  }>;
}

/**
 * Get the breakthrough rule for a specific rank transition
 */
export async function getBreakthroughRule(
  domainId: string,
  fromRank: Rank,
  divisionId?: string
): Promise<{
  tierRequired: Rank;
  challengeCount: number;
} | null> {
  const toRank = getNextRank(fromRank);
  if (!toRank) return null; // Already at S rank

  // Try to find a division-specific rule first
  if (divisionId) {
    const divisionRule = await db.breakthroughRule.findFirst({
      where: {
        domainId,
        fromRank,
        toRank,
        divisionId,
        isActive: true,
      },
    });
    if (divisionRule) {
      return {
        tierRequired: divisionRule.tierRequired as Rank,
        challengeCount: divisionRule.challengeCount,
      };
    }
  }

  // Try to find a global rule for this domain
  const globalRule = await db.breakthroughRule.findFirst({
    where: {
      domainId,
      fromRank,
      toRank,
      divisionId: null,
      isActive: true,
    },
  });

  if (globalRule) {
    return {
      tierRequired: globalRule.tierRequired as Rank,
      challengeCount: globalRule.challengeCount,
    };
  }

  // Fall back to defaults
  const defaultRule = DEFAULT_BREAKTHROUGH_RULES.find(
    r => r.fromRank === fromRank && r.toRank === toRank
  );

  return defaultRule || null;
}

/**
 * Count how many challenges an athlete has achieved at or above a tier in a domain
 */
export async function countQualifyingChallenges(
  athleteId: string,
  domainId: string,
  minTier: Rank
): Promise<{
  count: number;
  challenges: Array<{
    challengeId: string;
    challengeName: string;
    achievedTier: string;
  }>;
}> {
  const minTierIndex = RANK_INDEX[minTier];

  // Get all approved submissions for this athlete in challenges for this domain
  const submissions = await db.challengeSubmission.findMany({
    where: {
      athleteId,
      status: "APPROVED",
      achievedRank: { not: null },
      challenge: {
        isActive: true,
        primaryDomainId: domainId, // Only count primary domain challenges
      },
    },
    select: {
      challengeId: true,
      achievedRank: true,
      challenge: {
        select: {
          name: true,
        },
      },
    },
  });

  // Filter to only those at or above the required tier
  const qualifyingSubmissions = submissions.filter(s => {
    const achievedIndex = RANK_INDEX[s.achievedRank as Rank];
    return achievedIndex >= minTierIndex;
  });

  return {
    count: qualifyingSubmissions.length,
    challenges: qualifyingSubmissions.map(s => ({
      challengeId: s.challengeId,
      challengeName: s.challenge.name,
      achievedTier: s.achievedRank!,
    })),
  };
}

/**
 * Check an athlete's breakthrough progress for a specific domain
 */
export async function getBreakthroughProgress(
  athleteId: string,
  domainId: string,
  currentRank: Rank,
  divisionId?: string
): Promise<BreakthroughProgress | null> {
  const toRank = getNextRank(currentRank);
  if (!toRank) return null; // Already at max rank

  const rule = await getBreakthroughRule(domainId, currentRank, divisionId);
  if (!rule) return null;

  const { count, challenges } = await countQualifyingChallenges(
    athleteId,
    domainId,
    rule.tierRequired
  );

  return {
    fromRank: currentRank,
    toRank,
    tierRequired: rule.tierRequired,
    challengeCount: rule.challengeCount,
    currentProgress: count,
    isComplete: count >= rule.challengeCount,
    qualifyingChallenges: challenges,
  };
}

/**
 * Check if an athlete has completed their breakthrough requirement
 * and can advance to the next rank
 */
export async function canBreakthrough(
  athleteId: string,
  domainId: string,
  currentRank: Rank,
  divisionId?: string
): Promise<boolean> {
  const progress = await getBreakthroughProgress(
    athleteId,
    domainId,
    currentRank,
    divisionId
  );
  return progress?.isComplete ?? false;
}

/**
 * Process a breakthrough for an athlete
 * - Advances their rank letter
 * - Releases banked XP
 * - Updates breakthrough tracking
 */
export async function processBreakthrough(
  athleteId: string,
  domainId: string
): Promise<{
  success: boolean;
  newRank?: Rank;
  newSublevel?: number;
  releasedXP?: number;
  error?: string;
}> {
  const domainLevel = await db.domainLevel.findUnique({
    where: {
      athleteId_domainId: { athleteId, domainId },
    },
  });

  if (!domainLevel) {
    return { success: false, error: "Domain level not found" };
  }

  const currentRank = domainLevel.letter as Rank;
  const nextRank = getNextRank(currentRank);

  if (!nextRank) {
    return { success: false, error: "Already at maximum rank" };
  }

  // Get athlete's division for rule lookup
  const athlete = await db.athlete.findUnique({
    where: { id: athleteId },
    select: { gender: true, dateOfBirth: true },
  });

  if (!athlete) {
    return { success: false, error: "Athlete not found" };
  }

  // Find athlete's division
  const division = await db.division.findFirst({
    where: {
      isActive: true,
      OR: [
        { gender: athlete.gender },
        { gender: null },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });

  // Check if breakthrough requirements are met
  const canAdvance = await canBreakthrough(
    athleteId,
    domainId,
    currentRank,
    division?.id
  );

  if (!canAdvance) {
    return { success: false, error: "Breakthrough requirements not met" };
  }

  // Calculate new level with released banked XP
  const bankedXP = domainLevel.bankedXP;
  
  // Advance to next rank at sublevel 0
  // If there's banked XP, calculate how many sublevels that gives us in the new rank
  const { XP_PER_SUBLEVEL } = await import("./xp-constants");
  const xpPerSublevelInNewRank = XP_PER_SUBLEVEL[nextRank];
  const newSublevel = Math.min(9, Math.floor(bankedXP / xpPerSublevelInNewRank));
  const remainingXP = bankedXP - (newSublevel * xpPerSublevelInNewRank);

  // Update domain level
  await db.domainLevel.update({
    where: { id: domainLevel.id },
    data: {
      letter: nextRank,
      sublevel: newSublevel,
      bankedXP: remainingXP, // Any leftover after calculating sublevel
      breakthroughReady: false,
      breakthroughAchieved: new Date(),
    },
  });

  // Create XP transaction for the breakthrough
  await db.xPTransaction.create({
    data: {
      athleteId,
      domainId,
      amount: 0, // No new XP, just releasing banked
      source: "BONUS",
      note: `Breakthrough: ${currentRank} → ${nextRank}`,
    },
  });

  return {
    success: true,
    newRank: nextRank,
    newSublevel,
    releasedXP: bankedXP,
  };
}

/**
 * Get all breakthrough progress for an athlete across all domains
 */
export async function getAllBreakthroughProgress(
  athleteId: string,
  divisionId?: string
): Promise<
  Array<{
    domainId: string;
    domainName: string;
    domainSlug: string;
    progress: BreakthroughProgress | null;
  }>
> {
  const domains = await db.domain.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const domainLevels = await db.domainLevel.findMany({
    where: { athleteId },
    select: { domainId: true, letter: true },
  });

  const levelMap = new Map(domainLevels.map(l => [l.domainId, l.letter as Rank]));

  const results = await Promise.all(
    domains.map(async domain => {
      const currentRank = levelMap.get(domain.id) || "F";
      const progress = await getBreakthroughProgress(
        athleteId,
        domain.id,
        currentRank,
        divisionId
      );

      return {
        domainId: domain.id,
        domainName: domain.name,
        domainSlug: domain.slug,
        progress,
      };
    })
  );

  return results;
}
