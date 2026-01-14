/**
 * XP System Constants (client-safe - no db imports)
 * 
 * These constants can be imported in both client and server components.
 * For XP calculation functions that need database access, use @/lib/xp
 */

import { type Rank } from "./levels";

// ============================================
// XP THRESHOLDS - How much XP to level up
// ============================================

/**
 * XP required per sublevel (0-9) within each rank
 * Total XP to complete a rank = XP_PER_SUBLEVEL[rank] * 10
 */
export const XP_PER_SUBLEVEL: Record<Rank, number> = {
  F: 100,   // 1000 XP total for F-rank
  E: 200,   // 2000 XP total for E-rank
  D: 400,   // 4000 XP total for D-rank
  C: 800,   // 8000 XP total for C-rank
  B: 1600,  // 16000 XP total for B-rank
  A: 3200,  // 32000 XP total for A-rank
  S: 6400,  // 64000 XP total for S-rank (if there were more ranks)
};

/**
 * Total XP to complete each rank (all 10 sublevels)
 */
export const XP_PER_RANK: Record<Rank, number> = {
  F: 1000,
  E: 2000,
  D: 4000,
  C: 8000,
  B: 16000,
  A: 32000,
  S: 64000,
};

/**
 * Cumulative XP to REACH each rank (from F0)
 * F0 = 0, E0 = 1000, D0 = 3000, etc.
 */
export const CUMULATIVE_XP_TO_RANK: Record<Rank, number> = {
  F: 0,
  E: 1000,
  D: 3000,
  C: 7000,
  B: 15000,
  A: 31000,
  S: 63000,
};

/**
 * XP awarded for completing a tier (first time only)
 * This is the XP gained when you claim that tier of a challenge
 */
export const XP_PER_TIER: Record<Rank, number> = {
  F: 25,    // Foundation tier
  E: 50,    // Emerging tier
  D: 75,    // Developing tier
  C: 100,   // Competent tier
  B: 150,   // Breakthrough tier
  A: 200,   // Advanced tier
  S: 300,   // Supreme tier
};

/**
 * XP for Pass/Fail challenges based on their difficulty range
 * Uses the average of min and max rank XP
 */
export function getPassFailXP(minRank: Rank, maxRank: Rank): number {
  const minXP = XP_PER_TIER[minRank];
  const maxXP = XP_PER_TIER[maxRank];
  return Math.round((minXP + maxXP) / 2);
}
