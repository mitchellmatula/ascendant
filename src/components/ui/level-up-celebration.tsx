"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { getRankColor, getRankLabel, getRankName, type Rank } from "@/lib/levels";
import { cn } from "@/lib/utils";

interface LevelUpCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  previousLevel?: { letter: string; sublevel: number };
  newLevel: { letter: string; sublevel: number };
  domainName?: string;
  domainIcon?: string;
  xpGained?: number;
  isPrime?: boolean;
}

export function LevelUpCelebration({
  isOpen,
  onClose,
  previousLevel,
  newLevel,
  domainName,
  domainIcon,
  xpGained,
  isPrime = false,
}: LevelUpCelebrationProps) {
  const [showContent, setShowContent] = useState(false);

  const isRankUp = previousLevel && previousLevel.letter !== newLevel.letter;
  const rankColor = getRankColor(newLevel.letter as Rank);
  const rankName = getRankName(newLevel.letter as Rank);

  // Fire confetti
  const fireConfetti = useCallback(() => {
    const duration = isRankUp ? 3000 : 1500;
    const animationEnd = Date.now() + duration;

    const colors = isRankUp 
      ? [rankColor, "#ffd700", "#ffffff"] 
      : [rankColor, "#ffffff"];

    const frame = () => {
      confetti({
        particleCount: isRankUp ? 2 : 1,
        angle: 60,
        spread: 45,
        origin: { x: 0, y: 0.8 },
        colors,
        gravity: 1.2,
      });
      confetti({
        particleCount: isRankUp ? 2 : 1,
        angle: 120,
        spread: 45,
        origin: { x: 1, y: 0.8 },
        colors,
        gravity: 1.2,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Smaller burst for rank ups
    if (isRankUp) {
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 70,
          origin: { x: 0.5, y: 0.6 },
          colors,
          gravity: 1.5,
        });
      }, 300);
    }
  }, [isRankUp, rankColor]);

  useEffect(() => {
    if (isOpen) {
      // Delay content to sync with animation
      const timer = setTimeout(() => {
        setShowContent(true);
        fireConfetti();
      }, 200);

      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen, fireConfetti]);

  // Auto-close after animation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, isRankUp ? 5000 : 3500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isRankUp, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 15, 
              stiffness: 200,
              delay: 0.1 
            }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glowing background */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.3 }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ backgroundColor: rankColor }}
            />

            {/* Main card */}
            <motion.div
              className={cn(
                "relative bg-gradient-to-b from-background to-background/95 rounded-3xl p-8 md:p-12 text-center shadow-2xl border-2",
                "min-w-[300px] max-w-[400px]"
              )}
              style={{ borderColor: `${rankColor}40` }}
            >
              {/* Stars/sparkles decoration */}
              <Sparkles color={rankColor} />

              {/* Icon or domain */}
              {showContent && (
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4"
                >
                  {isPrime ? (
                    <div className="text-5xl mb-2">👑</div>
                  ) : domainIcon ? (
                    <div className="text-5xl mb-2">{domainIcon}</div>
                  ) : null}
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">
                    {isPrime ? "Prime Level" : domainName || "Level Up"}
                  </p>
                </motion.div>
              )}

              {/* Level badge with odometer */}
              {showContent && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring",
                    damping: 10,
                    stiffness: 200,
                    delay: 0.3 
                  }}
                  className="mb-4"
                >
                  <AnimatedRankBadge 
                    letter={newLevel.letter} 
                    sublevel={newLevel.sublevel}
                    previousLetter={previousLevel?.letter}
                    previousSublevel={previousLevel?.sublevel}
                    isRankUp={isRankUp}
                  />
                </motion.div>
              )}

              {/* Rank name with odometer effect */}
              {showContent && (
                <OdometerRankName 
                  previousName={previousLevel ? getRankName(previousLevel.letter as Rank) : undefined}
                  newName={rankName}
                  color={rankColor}
                  previousColor={previousLevel ? getRankColor(previousLevel.letter as Rank) : undefined}
                />
              )}

              {/* Title */}
              {showContent && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    {isRankUp ? (
                      <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                        Rank Up!
                      </span>
                    ) : (
                      <span style={{ color: rankColor }}>Level Up!</span>
                    )}
                  </h2>

                  {previousLevel && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.0 }}
                      className="text-sm text-muted-foreground mt-2"
                    >
                      {previousLevel.letter}{previousLevel.sublevel} → {newLevel.letter}{newLevel.sublevel}
                    </motion.p>
                  )}

                  {xpGained && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.1, type: "spring" }}
                      className="mt-4 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full"
                    >
                      <span className="text-xl">⚡</span>
                      <span className="font-bold text-primary">+{xpGained} XP</span>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Tap to close */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1.5 }}
                className="text-xs text-muted-foreground mt-6"
              >
                Tap anywhere to continue
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Odometer-style rank name with transition from old to new
function OdometerRankName({ 
  previousName,
  newName, 
  color,
  previousColor,
}: { 
  previousName?: string;
  newName: string; 
  color: string;
  previousColor?: string;
}) {
  const [showNew, setShowNew] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNew(true);
    }, 1200); // Same timing as badge transition
    return () => clearTimeout(timer);
  }, []);

  const displayName = showNew ? newName : (previousName || newName);
  const displayColor = showNew ? color : (previousColor || color);
  const shouldAnimate = showNew && previousName && previousName !== newName;

  return (
    <div className="mb-4 h-10 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={displayName}
          initial={shouldAnimate ? { y: 40, opacity: 0 } : { y: 0, opacity: 1 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="text-xl md:text-2xl font-bold tracking-wide"
          style={{ color: displayColor }}
        >
          {displayName}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Animated rank badge component with odometer transition
function AnimatedRankBadge({ 
  letter, 
  sublevel,
  previousLetter,
  previousSublevel,
  isRankUp 
}: { 
  letter: string; 
  sublevel: number;
  previousLetter?: string;
  previousSublevel?: number;
  isRankUp?: boolean;
}) {
  const color = getRankColor(letter as Rank);
  const [showNew, setShowNew] = useState(false);
  
  // Show old level first, then transition to new
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNew(true);
    }, 1200); // Longer pause before transitioning
    return () => clearTimeout(timer);
  }, []);

  const displayLetter = showNew ? letter : (previousLetter || letter);
  const displaySublevel = showNew ? sublevel : (previousSublevel ?? sublevel);
  const displayColor = getRankColor(displayLetter as Rank);

  return (
    <div className="relative inline-block">
      {/* Pulse ring for rank ups */}
      {isRankUp && showNew && (
        <motion.div
          initial={{ scale: 0.8, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeOut"
          }}
          className="absolute inset-0 rounded-full"
          style={{ 
            backgroundColor: color,
            filter: "blur(4px)"
          }}
        />
      )}

      {/* Main badge */}
      <motion.div
        className="relative w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center"
        style={{ 
          background: `linear-gradient(135deg, ${displayColor}, ${displayColor}80)`,
          boxShadow: `0 0 40px ${displayColor}60`
        }}
        animate={isRankUp && showNew ? {
          boxShadow: [
            `0 0 40px ${color}60`,
            `0 0 60px ${color}80`,
            `0 0 40px ${color}60`,
          ],
          background: `linear-gradient(135deg, ${color}, ${color}80)`,
        } : {}}
        transition={{ duration: showNew ? 0.6 : 0, repeat: isRankUp ? Infinity : 0, repeatDelay: 1.5 }}
      >
        {/* Inner circle */}
        <div 
          className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-background flex items-center justify-center"
          style={{ boxShadow: `inset 0 0 20px ${displayColor}30` }}
        >
          {/* Letter and number side by side with odometer */}
          <div className="flex items-baseline justify-center -space-x-1">
            {/* Letter with odometer */}
            <div 
              className="relative overflow-hidden"
              style={{ height: '4rem', width: '2.2rem' }}
            >
              {/* Old letter sliding out */}
              {showNew && previousLetter && previousLetter !== letter && (
                <motion.span
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -70, opacity: 0 }}
                  transition={{ 
                    duration: 0.6,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-black"
                  style={{ color: getRankColor(previousLetter as Rank) }}
                >
                  {previousLetter}
                </motion.span>
              )}
              
              {/* New/current letter */}
              <motion.span
                initial={showNew && previousLetter && previousLetter !== letter 
                  ? { y: 70, opacity: 0 } 
                  : { y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-black"
                style={{ color: displayColor }}
              >
                {displayLetter}
              </motion.span>
            </div>
            
            {/* Sublevel with odometer - same font as letter */}
            <div 
              className="relative overflow-hidden"
              style={{ height: '4rem', width: '2rem' }}
            >
              {/* Old sublevel sliding out */}
              {showNew && previousSublevel !== undefined && (previousSublevel !== sublevel || previousLetter !== letter) && (
                <motion.span
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -70, opacity: 0 }}
                  transition={{ 
                    duration: 0.6,
                    delay: 0.08,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-black"
                  style={{ color: getRankColor((previousLetter || letter) as Rank) }}
                >
                  {previousSublevel}
                </motion.span>
              )}
              
              {/* New/current sublevel - matching font */}
              <motion.span
                initial={showNew && previousSublevel !== undefined && (previousSublevel !== sublevel || previousLetter !== letter)
                  ? { y: 70, opacity: 0 } 
                  : { y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  duration: 0.6,
                  delay: 0.08,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-black"
                style={{ color: displayColor }}
              >
                {displaySublevel}
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Floating sparkles decoration
function Sparkles({ color }: { color: string }) {
  const sparkles = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 8,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg viewBox="0 0 24 24" fill={color}>
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
