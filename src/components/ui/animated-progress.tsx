"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
  color?: string;
  duration?: number; // Animation duration in ms
  showSurge?: boolean; // Show a surge/glow effect when increasing
  height?: string;
}

/**
 * AnimatedProgress - A progress bar that smoothly animates and surges when value increases
 */
export function AnimatedProgress({
  value,
  className,
  barClassName,
  color,
  duration = 800,
  showSurge = true,
  height = "h-2",
}: AnimatedProgressProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isSurging, setIsSurging] = useState(false);
  const [surgeDirection, setSurgeDirection] = useState<"increase" | "decrease">("increase");
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const prevValue = prevValueRef.current;
    
    if (value !== prevValue) {
      const isIncrease = value > prevValue;
      setSurgeDirection(isIncrease ? "increase" : "decrease");
      
      if (showSurge && isIncrease) {
        setIsSurging(true);
      }

      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const startTime = performance.now();
      const startValue = prevValue;
      const diff = value - startValue;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth ease out with subtle overshoot for natural feel
        let eased: number;
        if (isIncrease && showSurge && progress < 0.8) {
          // Smooth cubic ease with slight overshoot
          const p = progress / 0.8;
          eased = 1 - Math.pow(1 - p, 3);
          eased = eased * 1.05; // 5% subtle overshoot
        } else if (isIncrease && showSurge) {
          // Settle back smoothly to final value
          const settleProgress = (progress - 0.8) / 0.2;
          const settleEase = 1 - Math.pow(1 - settleProgress, 2);
          eased = 1.05 - 0.05 * settleEase;
        } else {
          // Standard smooth ease out
          eased = 1 - Math.pow(1 - progress, 3);
        }
        
        const newValue = startValue + diff * Math.min(eased, 1.05);
        setDisplayValue(Math.min(Math.max(newValue, 0), 100));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
          setIsSurging(false);
          prevValueRef.current = value;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, showSurge]);

  // Remove surge effect after animation
  useEffect(() => {
    if (isSurging) {
      const timeout = setTimeout(() => setIsSurging(false), duration);
      return () => clearTimeout(timeout);
    }
  }, [isSurging, duration]);

  return (
    <div 
      className={cn(
        "relative w-full bg-muted rounded-full overflow-hidden",
        height,
        className
      )}
    >
      {/* Main progress bar */}
      <div
        className={cn(
          "h-full rounded-full transition-colors relative",
          barClassName
        )}
        style={{
          width: `${Math.min(displayValue, 100)}%`,
          backgroundColor: color,
          transition: "background-color 0.2s",
        }}
      >
        {/* Surge glow effect */}
        {isSurging && surgeDirection === "increase" && (
          <div 
            className="absolute inset-0 animate-surge-glow rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color || 'hsl(var(--primary))'}88, white, ${color || 'hsl(var(--primary))'}88, transparent)`,
              backgroundSize: "200% 100%",
            }}
          />
        )}
      </div>

      {/* Shine effect on surge */}
      {isSurging && surgeDirection === "increase" && (
        <div 
          className="absolute inset-0 animate-shine-sweep pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            backgroundSize: "50% 100%",
          }}
        />
      )}
    </div>
  );
}

/**
 * AnimatedProgressWithLabel - Progress bar with animated XP label
 */
interface AnimatedProgressWithLabelProps extends Omit<AnimatedProgressProps, 'value'> {
  currentXP: number;
  targetXP: number;
  showXP?: boolean;
  labelClassName?: string;
}

export function AnimatedProgressWithLabel({
  currentXP,
  targetXP,
  showXP = true,
  labelClassName,
  ...progressProps
}: AnimatedProgressWithLabelProps) {
  const [displayXP, setDisplayXP] = useState(currentXP);
  const prevXPRef = useRef(currentXP);

  useEffect(() => {
    if (currentXP !== prevXPRef.current) {
      const startXP = prevXPRef.current;
      const diff = currentXP - startXP;
      const steps = Math.min(Math.abs(diff), 30);
      const stepDuration = (progressProps.duration || 800) / steps;
      
      let currentStep = 0;
      
      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayXP(Math.round(startXP + diff * eased));
        
        if (currentStep >= steps) {
          clearInterval(interval);
          setDisplayXP(currentXP);
          prevXPRef.current = currentXP;
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [currentXP, progressProps.duration]);

  const percentage = targetXP > 0 ? (currentXP / targetXP) * 100 : 0;

  return (
    <div className="space-y-1">
      <AnimatedProgress value={percentage} {...progressProps} />
      {showXP && (
        <div className={cn("text-xs text-muted-foreground flex justify-between", labelClassName)}>
          <span className="tabular-nums">{displayXP.toLocaleString()} XP</span>
          <span className="tabular-nums">{targetXP.toLocaleString()} XP</span>
        </div>
      )}
    </div>
  );
}
