"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { LevelUpCelebration } from "./level-up-celebration";
import { TierAchievement } from "./tier-achievement";
import { fromNumericLevel } from "@/lib/levels";

// Types for celebration data
export interface LevelUpData {
  previousLevel: number;
  newLevel: number;
  domainName: string;
  domainIcon?: string;
  xpGained: number;
}

export interface TierAchievementData {
  tier: "F" | "E" | "D" | "C" | "B" | "A" | "S";
  challengeName: string;
  xpBreakdown: Array<{ domainName: string; xp: number }>;
  totalXp: number;
  isNewBest?: boolean;
}

// Helper to convert numeric level to letter/sublevel object
function numericToLevelObject(numeric: number): { letter: string; sublevel: number } {
  const { letter, sublevel } = fromNumericLevel(numeric);
  return { letter, sublevel };
}

export interface TierAchievementData {
  tier: "F" | "E" | "D" | "C" | "B" | "A" | "S";
  challengeName: string;
  xpBreakdown: Array<{ domainName: string; xp: number }>;
  totalXp: number;
  isNewBest?: boolean;
}

interface CelebrationContextType {
  showLevelUp: (data: LevelUpData) => void;
  showTierAchievement: (data: TierAchievementData) => void;
  queueCelebrations: (celebrations: {
    tierAchievement?: TierAchievementData;
    levelUps?: LevelUpData[];
  }) => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error("useCelebration must be used within a CelebrationProvider");
  }
  return context;
}

interface CelebrationProviderProps {
  children: ReactNode;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  // Level up celebration state
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);

  // Tier achievement state
  const [tierData, setTierData] = useState<TierAchievementData | null>(null);
  const [isTierOpen, setIsTierOpen] = useState(false);

  // Queue for handling multiple celebrations
  const [celebrationQueue, setCelebrationQueue] = useState<
    Array<{ type: "levelUp"; data: LevelUpData } | { type: "tier"; data: TierAchievementData }>
  >([]);

  // Process the next celebration in queue
  const processQueue = useCallback(() => {
    setCelebrationQueue((queue) => {
      if (queue.length === 0) return queue;

      const [next, ...rest] = queue;

      // Small delay before showing next celebration
      setTimeout(() => {
        if (next.type === "levelUp") {
          setLevelUpData(next.data);
          setIsLevelUpOpen(true);
        } else {
          setTierData(next.data);
          setIsTierOpen(true);
        }
      }, 300);

      return rest;
    });
  }, []);

  // Show a single level up celebration
  const showLevelUp = useCallback((data: LevelUpData) => {
    setLevelUpData(data);
    setIsLevelUpOpen(true);
  }, []);

  // Show a single tier achievement celebration
  const showTierAchievement = useCallback((data: TierAchievementData) => {
    setTierData(data);
    setIsTierOpen(true);
  }, []);

  // Queue multiple celebrations (tier first, then level ups)
  const queueCelebrations = useCallback(
    (celebrations: {
      tierAchievement?: TierAchievementData;
      levelUps?: LevelUpData[];
    }) => {
      const queue: Array<
        { type: "levelUp"; data: LevelUpData } | { type: "tier"; data: TierAchievementData }
      > = [];

      // Add tier achievement first
      if (celebrations.tierAchievement) {
        queue.push({ type: "tier", data: celebrations.tierAchievement });
      }

      // Then add any level ups
      if (celebrations.levelUps) {
        for (const levelUp of celebrations.levelUps) {
          queue.push({ type: "levelUp", data: levelUp });
        }
      }

      if (queue.length === 0) return;

      // Show the first one immediately
      const [first, ...rest] = queue;
      setCelebrationQueue(rest);

      if (first.type === "levelUp") {
        setLevelUpData(first.data);
        setIsLevelUpOpen(true);
      } else {
        setTierData(first.data);
        setIsTierOpen(true);
      }
    },
    []
  );

  // Handle closing level up celebration
  const handleLevelUpClose = useCallback(() => {
    setIsLevelUpOpen(false);
    setLevelUpData(null);
    // Process next in queue after a small delay
    setTimeout(processQueue, 200);
  }, [processQueue]);

  // Handle closing tier achievement celebration
  const handleTierClose = useCallback(() => {
    setIsTierOpen(false);
    setTierData(null);
    // Process next in queue after a small delay
    setTimeout(processQueue, 200);
  }, [processQueue]);

  return (
    <CelebrationContext.Provider
      value={{ showLevelUp, showTierAchievement, queueCelebrations }}
    >
      {children}

      {/* Level Up Celebration Modal */}
      {levelUpData && (
        <LevelUpCelebration
          isOpen={isLevelUpOpen}
          onClose={handleLevelUpClose}
          previousLevel={numericToLevelObject(levelUpData.previousLevel)}
          newLevel={numericToLevelObject(levelUpData.newLevel)}
          domainName={levelUpData.domainName}
          domainIcon={levelUpData.domainIcon}
          xpGained={levelUpData.xpGained}
        />
      )}

      {/* Tier Achievement Modal */}
      {tierData && (
        <TierAchievement
          isOpen={isTierOpen}
          onClose={handleTierClose}
          tier={tierData.tier}
          challengeName={tierData.challengeName}
          xpBreakdown={tierData.xpBreakdown}
          totalXp={tierData.totalXp}
          isNewBest={tierData.isNewBest}
        />
      )}
    </CelebrationContext.Provider>
  );
}
