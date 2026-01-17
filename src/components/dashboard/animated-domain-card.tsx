"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { getRankColor, getRankLabel, type Rank, getNextRank } from "@/lib/levels";
import { Lock, Unlock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DomainCardProps {
  domain: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  };
  level: {
    letter: string;
    sublevel: number;
    currentXP: number;
    bankedXP: number;
    breakthroughReady: boolean;
  } | null;
  progress: number;
  xpToNext: number;
  breakthroughProgress?: {
    currentProgress: number;
    challengeCount: number;
    isComplete: boolean;
    toRank: string;
  } | null;
}

export function AnimatedDomainCard({
  domain,
  level,
  progress,
  xpToNext,
  breakthroughProgress,
}: DomainCardProps) {
  const letter = (level?.letter ?? "F") as Rank;
  const sublevel = level?.sublevel ?? 0;
  const currentXP = level?.currentXP ?? 0;
  const bankedXP = level?.bankedXP ?? 0;
  const breakthroughReady = level?.breakthroughReady ?? false;
  
  const nextRank = getNextRank(letter);
  const atMaxSublevel = sublevel === 9;
  const needsBreakthrough = atMaxSublevel && nextRank;

  // Track previous values for animation detection
  const prevXPRef = useRef(currentXP);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Only trigger animation after initial render if XP changed
    if (prevXPRef.current !== currentXP && hasAnimated) {
      // XP changed - animation will trigger automatically in child components
    }
    prevXPRef.current = currentXP;
    setHasAnimated(true);
  }, [currentXP, hasAnimated]);

  return (
    <Link href={`/domains/${domain.slug}`}>
      <Card className={`hover:shadow-lg transition-shadow cursor-pointer h-full ${
        breakthroughReady ? "ring-2 ring-amber-500/50" : ""
      }`}>
        <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
          <CardTitle className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
            <span className="text-lg md:text-xl">{domain.icon ?? "🎯"}</span>
            <span className="truncate">{domain.name}</span>
            {breakthroughReady && (
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
          {/* Animated Level Display */}
          <AnimatedLevelDisplay
            letter={letter}
            sublevel={sublevel}
            className="text-3xl md:text-4xl font-bold mb-1 md:mb-2"
            color={domain.color ?? getRankColor(letter)}
          />
          
          <div className="text-xs md:text-sm text-muted-foreground">
            {getRankLabel(letter)}
          </div>
          
          {/* Animated XP Display */}
          <div className="mt-1.5 md:mt-2 text-xs text-muted-foreground">
            <AnimatedNumber 
              value={currentXP} 
              className="tabular-nums"
              duration={800}
            /> XP
            {bankedXP > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {" "}(+<AnimatedNumber value={bankedXP} duration={600} /> banked)
              </span>
            )}
          </div>
          
          {/* Progress bar within sublevel */}
          {!needsBreakthrough ? (
            <div className="mt-1.5 md:mt-2">
              <AnimatedProgress
                value={progress}
                color={domain.color ?? getRankColor(letter)}
                height="h-1.5 md:h-2"
                duration={800}
                showSurge={true}
              />
              <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                <AnimatedNumber value={xpToNext} duration={600} /> XP to next level
              </div>
            </div>
          ) : (
            /* Breakthrough progress indicator */
            <div className="mt-1.5 md:mt-2">
              {breakthroughProgress && (
                <>
                  <div className="flex items-center gap-1 text-[10px] md:text-xs mb-1">
                    {breakthroughProgress.isComplete ? (
                      <Unlock className="w-3 h-3 text-green-500" />
                    ) : (
                      <Lock className="w-3 h-3 text-amber-500" />
                    )}
                    <span className={breakthroughProgress.isComplete ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                      {breakthroughProgress.currentProgress}/{breakthroughProgress.challengeCount} for {breakthroughProgress.toRank}
                    </span>
                  </div>
                  <AnimatedProgress
                    value={(breakthroughProgress.currentProgress / breakthroughProgress.challengeCount) * 100}
                    color={breakthroughProgress.isComplete ? "#22c55e" : "#f59e0b"}
                    height="h-1.5 md:h-2"
                    duration={800}
                    showSurge={true}
                  />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// Wrapper component that adds style prop and odometer effect to AnimatedLevel
interface AnimatedLevelDisplayProps {
  letter: string;
  sublevel: number;
  className?: string;
  color?: string;
}

function AnimatedLevelDisplay({
  letter,
  sublevel,
  className,
  color,
}: AnimatedLevelDisplayProps) {
  const [currentLetter, setCurrentLetter] = useState(letter);
  const [previousLetter, setPreviousLetter] = useState<string | null>(null);
  const [isLetterRolling, setIsLetterRolling] = useState(false);
  
  const [currentSublevel, setCurrentSublevel] = useState(sublevel);
  const [previousSublevel, setPreviousSublevel] = useState<number | null>(null);
  const [isSublevelRolling, setIsSublevelRolling] = useState(false);
  
  const prevLetterRef = useRef(letter);
  const prevSublevelRef = useRef(sublevel);

  // Handle letter changes with odometer effect
  useEffect(() => {
    if (letter !== prevLetterRef.current) {
      setPreviousLetter(prevLetterRef.current);
      setIsLetterRolling(true);
      
      const timer = setTimeout(() => {
        setCurrentLetter(letter);
        prevLetterRef.current = letter;
      }, 50);

      const clearTimer = setTimeout(() => {
        setIsLetterRolling(false);
        setPreviousLetter(null);
      }, 400);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [letter]);

  // Handle sublevel changes with odometer effect
  useEffect(() => {
    if (sublevel !== prevSublevelRef.current) {
      setPreviousSublevel(prevSublevelRef.current);
      setIsSublevelRolling(true);
      
      const timer = setTimeout(() => {
        setCurrentSublevel(sublevel);
        prevSublevelRef.current = sublevel;
      }, 50);

      const clearTimer = setTimeout(() => {
        setIsSublevelRolling(false);
        setPreviousSublevel(null);
      }, 350);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [sublevel]);

  return (
    <span className={cn("inline-flex items-baseline", className)} style={{ color }}>
      {/* Letter with odometer effect */}
      <span 
        className="relative inline-block overflow-hidden"
        style={{ 
          width: '0.75em',
          height: '1.1em',
          lineHeight: '1.1em',
        }}
      >
        {isLetterRolling && previousLetter && (
          <span className="absolute inset-0 flex items-center justify-center animate-rank-change">
            {previousLetter}
          </span>
        )}
        <span 
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            isLetterRolling && "animate-rank-enter"
          )}
        >
          {currentLetter}
        </span>
      </span>
      
      {/* Sublevel with odometer effect */}
      <span 
        className="relative inline-block overflow-hidden"
        style={{ 
          width: '0.6em',
          height: '1.1em',
          lineHeight: '1.1em',
        }}
      >
        {isSublevelRolling && previousSublevel !== null && (
          <span className="absolute inset-0 flex items-center justify-center animate-sublevel-change">
            {previousSublevel}
          </span>
        )}
        <span 
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            isSublevelRolling && "animate-sublevel-enter"
          )}
        >
          {currentSublevel}
        </span>
      </span>
    </span>
  );
}
