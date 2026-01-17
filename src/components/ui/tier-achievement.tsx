"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { getRankColor, getRankName, type Rank } from "@/lib/levels";
import { cn } from "@/lib/utils";

interface TierAchievementProps {
  isOpen: boolean;
  onClose: () => void;
  tier: string; // F, E, D, C, B, A, S
  challengeName: string;
  xpBreakdown?: Array<{
    domainName: string;
    domainIcon?: string;
    xp: number;
  }>;
  totalXp?: number;
  isNewBest?: boolean; // True if this beats their previous tier
}

export function TierAchievement({
  isOpen,
  onClose,
  tier,
  challengeName,
  xpBreakdown,
  totalXp,
  isNewBest = true,
}: TierAchievementProps) {
  const [showXpBreakdown, setShowXpBreakdown] = useState(false);
  const tierColor = getRankColor(tier as Rank);
  const tierName = getRankName(tier as Rank);

  // Fire confetti based on tier
  const fireConfetti = useCallback(() => {
    const intensity = {
      F: { particles: 20, spread: 40 },
      E: { particles: 30, spread: 50 },
      D: { particles: 40, spread: 60 },
      C: { particles: 60, spread: 70 },
      B: { particles: 80, spread: 80 },
      A: { particles: 100, spread: 90 },
      S: { particles: 150, spread: 100 },
    }[tier] || { particles: 50, spread: 60 };

    // Side cannons
    confetti({
      particleCount: intensity.particles / 2,
      angle: 60,
      spread: intensity.spread,
      origin: { x: 0, y: 0.8 },
      colors: [tierColor, "#ffffff", "#ffd700"],
    });
    confetti({
      particleCount: intensity.particles / 2,
      angle: 120,
      spread: intensity.spread,
      origin: { x: 1, y: 0.8 },
      colors: [tierColor, "#ffffff", "#ffd700"],
    });

    // S-tier gets extra celebration
    if (tier === "S") {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 160,
          origin: { x: 0.5, y: 0.4 },
          colors: ["#ffd700", "#ffec8b", "#ffffff"],
        });
      }, 300);
    }
  }, [tier, tierColor]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fireConfetti();
      }, 300);

      // Show XP breakdown after initial animation
      const xpTimer = setTimeout(() => {
        setShowXpBreakdown(true);
      }, 800);

      return () => {
        clearTimeout(timer);
        clearTimeout(xpTimer);
      };
    } else {
      setShowXpBreakdown(false);
    }
  }, [isOpen, fireConfetti]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card */}
            <div 
              className="bg-gradient-to-b from-background to-background/95 rounded-2xl overflow-hidden shadow-2xl border"
              style={{ borderColor: `${tierColor}30` }}
            >
              {/* Top banner */}
              <div 
                className="relative h-24 flex items-center justify-center overflow-hidden"
                style={{ 
                  background: `linear-gradient(135deg, ${tierColor}20, ${tierColor}40)`
                }}
              >
                {/* Animated rays */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 left-1/2 h-32 w-1"
                      style={{
                        background: `linear-gradient(to top, transparent, ${tierColor}40)`,
                        transformOrigin: "bottom center",
                        transform: `translateX(-50%) rotate(${i * 30}deg)`,
                      }}
                    />
                  ))}
                </motion.div>

                {/* Tier badge */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                  className="relative z-10"
                >
                  <TierBadge tier={tier} color={tierColor} />
                </motion.div>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                {/* Status */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {isNewBest ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 mb-2">
                      <span>⭐</span> New Personal Best!
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground mb-2 block">
                      Challenge Complete
                    </span>
                  )}
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl font-bold mb-1"
                  style={{ color: tierColor }}
                >
                  {tier}-Tier Result!
                </motion.h2>

                {/* Challenge name */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted-foreground mb-1 line-clamp-2"
                >
                  {challengeName}
                </motion.p>

                {/* Clarification that this is challenge tier */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="text-xs text-muted-foreground/70 mb-4"
                >
                  Challenge performance tier
                </motion.p>

                {/* XP Breakdown */}
                {xpBreakdown && xpBreakdown.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                      opacity: showXpBreakdown ? 1 : 0,
                      height: showXpBreakdown ? "auto" : 0
                    }}
                    className="space-y-2 mb-4"
                  >
                    {xpBreakdown.map((item, index) => (
                      <motion.div
                        key={item.domainName}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2"
                      >
                        <span className="flex items-center gap-2">
                          {item.domainIcon && <span>{item.domainIcon}</span>}
                          <span>{item.domainName}</span>
                        </span>
                        <span className="font-semibold text-primary">
                          +{item.xp} XP
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Total XP */}
                {totalXp && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring", damping: 10 }}
                    className="inline-flex items-center gap-2 bg-primary/10 px-5 py-2.5 rounded-full"
                  >
                    <span className="text-2xl">⚡</span>
                    <span className="text-xl font-bold text-primary">
                      +{totalXp} XP
                    </span>
                  </motion.div>
                )}

                {/* Continue button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  onClick={onClose}
                  className="mt-6 w-full py-3 rounded-xl font-semibold text-white transition-colors"
                  style={{ backgroundColor: tierColor }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Tier badge component
function TierBadge({ tier, color }: { tier: string; color: string }) {
  const isHighTier = ["B", "A", "S"].includes(tier);

  return (
    <div className="relative">
      {/* Glow effect for high tiers */}
      {isHighTier && (
        <motion.div
          className="absolute inset-0 rounded-full blur-lg"
          style={{ backgroundColor: color }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Badge */}
      <div
        className={cn(
          "relative w-20 h-20 rounded-full flex items-center justify-center",
          "shadow-lg"
        )}
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}80)`,
          boxShadow: `0 4px 20px ${color}50`
        }}
      >
        <div 
          className="w-16 h-16 rounded-full bg-background flex items-center justify-center"
          style={{ boxShadow: `inset 0 0 10px ${color}20` }}
        >
          <span 
            className="text-3xl font-black"
            style={{ color }}
          >
            {tier}
          </span>
        </div>
      </div>

      {/* Crown for S-tier */}
      {tier === "S" && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl"
        >
          👑
        </motion.div>
      )}
    </div>
  );
}
