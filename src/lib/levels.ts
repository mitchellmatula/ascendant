/**
 * Level System Utilities
 * 
 * Rank Letters & Numeric Values:
 * | Rank | Name         | Numeric Range | Example |
 * |------|--------------|---------------|---------|}
 * | F    | Foundation   | 0-9           | F7 = 7  |
 * | E    | Explorer     | 10-19         | E3 = 13 |
 * | D    | Disciplined  | 20-29         | D5 = 25 |
 * | C    | Challenger   | 30-39         | C7 = 37 |
 * | B    | Breakthrough | 40-49         | B2 = 42 |
 * | A    | Apex         | 50-59         | A0 = 50 |
 * | S    | Supreme      | 60-69         | S9 = 69 |
 */

export const RANKS = ["F", "E", "D", "C", "B", "A", "S"] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_INDEX: Record<Rank, number> = {
  F: 0,
  E: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 5,
  S: 6,
};

export const SUBLEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type Sublevel = (typeof SUBLEVELS)[number];

/**
 * Convert letter rank + sublevel to numeric value
 * Example: C7 = 37, D3 = 23
 */
export function toNumericLevel(letter: Rank, sublevel: number): number {
  const rankIndex = RANK_INDEX[letter];
  return rankIndex * 10 + sublevel;
}

/**
 * Convert numeric value to letter rank + sublevel
 * Example: 37 = C7, 29 = D9
 */
export function fromNumericLevel(numeric: number): { letter: Rank; sublevel: number } {
  const clampedNumeric = Math.max(0, Math.min(69, Math.floor(numeric)));
  const rankIndex = Math.floor(clampedNumeric / 10);
  const sublevel = clampedNumeric % 10;
  return {
    letter: RANKS[rankIndex],
    sublevel,
  };
}

/**
 * Format level as string (e.g., "C7", "A0")
 */
export function formatLevel(letter: Rank | string, sublevel: number): string {
  return `${letter}${sublevel}`;
}

/**
 * Calculate Prime level from 4 domain levels
 * Prime = average of all 4 domain numeric values
 */
export function calculatePrime(
  domainLevels: Array<{ letter: string; sublevel: number }>
): { letter: Rank; sublevel: number; numericValue: number } {
  if (domainLevels.length === 0) {
    return { letter: "F", sublevel: 0, numericValue: 0 };
  }

  const total = domainLevels.reduce((sum, level) => {
    return sum + toNumericLevel(level.letter as Rank, level.sublevel);
  }, 0);

  const average = total / domainLevels.length;
  const rounded = Math.floor(average);
  
  return {
    ...fromNumericLevel(rounded),
    numericValue: average,
  };
}

/**
 * Get display color for a rank
 */
export function getRankColor(letter: Rank | string): string {
  const colors: Record<string, string> = {
    F: "#6b7280", // gray
    E: "#22c55e", // green
    D: "#3b82f6", // blue
    C: "#a855f7", // purple
    B: "#f97316", // orange
    A: "#ef4444", // red
    S: "#eab308", // gold
  };
  return colors[letter] || colors.F;
}

/**
 * Rank names - the Ascendant Ladder
 */
export const RANK_NAMES: Record<Rank, string> = {
  F: "Foundation",
  E: "Explorer",
  D: "Disciplined",
  C: "Challenger",
  B: "Breakthrough",
  A: "Apex",
  S: "Supreme",
};

/**
 * Rank descriptions - what each rank means
 */
export const RANK_DESCRIPTIONS: Record<Rank, string> = {
  F: "Learning the basics. Building the base.",
  E: "Trying new skills. Expanding capability.",
  D: "Training with intent. Showing consistency.",
  C: "Taking on real tests. Pushing limits.",
  B: "Major capability unlocked.",
  A: "Advanced performance.",
  S: "Exceptional. Rare.",
};

/**
 * Get rank name (e.g., "Foundation", "Explorer")
 */
export function getRankName(letter: Rank | string): string {
  return RANK_NAMES[letter as Rank] || RANK_NAMES.F;
}

/**
 * Get rank label with description (alias for getRankName for backwards compatibility)
 */
export function getRankLabel(letter: Rank | string): string {
  return getRankName(letter);
}

/**
 * Get rank description
 */
export function getRankDescription(letter: Rank | string): string {
  return RANK_DESCRIPTIONS[letter as Rank] || RANK_DESCRIPTIONS.F;
}

/**
 * Format rank with name (e.g., "C - Challenger", "B7 - Breakthrough")
 */
export function formatRankWithName(letter: Rank | string, sublevel?: number): string {
  const name = getRankName(letter);
  if (sublevel !== undefined) {
    return `${letter}${sublevel} - ${name}`;
  }
  return `${letter} - ${name}`;
}

/**
 * Check if rank A is higher than rank B
 */
export function isHigherRank(rankA: Rank, sublevelA: number, rankB: Rank, sublevelB: number): boolean {
  return toNumericLevel(rankA, sublevelA) > toNumericLevel(rankB, sublevelB);
}

/**
 * Get next rank after current rank
 */
export function getNextRank(currentRank: Rank): Rank | null {
  const currentIndex = RANK_INDEX[currentRank];
  if (currentIndex >= RANKS.length - 1) return null;
  return RANKS[currentIndex + 1];
}
