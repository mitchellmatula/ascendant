"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number; // Animation duration in ms
  formatOptions?: Intl.NumberFormatOptions;
}

/**
 * AnimatedNumber - Displays a number with smooth odometer-style digit transitions
 * Digits roll up smoothly like a mechanical counter
 */
export function AnimatedNumber({
  value,
  className,
  duration = 800,
  formatOptions,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const startValue = prevValueRef.current;
      const endValue = value;
      const diff = endValue - startValue;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth ease-out cubic for relaxed deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const newValue = Math.round(startValue + diff * eased);
        setDisplayValue(newValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          prevValueRef.current = endValue;
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [value, duration]);

  const formattedValue = formatOptions 
    ? new Intl.NumberFormat('en-US', formatOptions).format(displayValue)
    : displayValue.toLocaleString();

  return (
    <span className={cn("inline-flex tabular-nums", className)}>
      {formattedValue.split('').map((char, index) => (
        <OdometerDigit 
          key={index} 
          char={char} 
          index={index}
        />
      ))}
    </span>
  );
}

interface OdometerDigitProps {
  char: string;
  index: number;
}

/**
 * Individual digit with odometer rolling effect
 */
function OdometerDigit({ char, index }: OdometerDigitProps) {
  const [currentChar, setCurrentChar] = useState(char);
  const [previousChar, setPreviousChar] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const prevCharRef = useRef(char);

  useEffect(() => {
    if (char !== prevCharRef.current) {
      setPreviousChar(prevCharRef.current);
      setIsRolling(true);
      
      // Update to new char after animation starts
      const timer = setTimeout(() => {
        setCurrentChar(char);
        prevCharRef.current = char;
      }, 50);

      // Clear rolling state after animation completes
      const clearTimer = setTimeout(() => {
        setIsRolling(false);
        setPreviousChar(null);
      }, 500);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [char]);

  const isNumber = /\d/.test(char);
  
  if (!isNumber) {
    // Non-digits (commas, periods) don't animate
    return <span className="inline-block">{char}</span>;
  }

  return (
    <span 
      className="inline-block relative overflow-hidden"
      style={{
        width: '0.6em',
        height: '1.2em',
        lineHeight: '1.2em',
      }}
    >
      {/* Previous digit rolling out */}
      {isRolling && previousChar && (
        <span
          className="absolute inset-0 flex items-center justify-center animate-odometer-up"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          {previousChar}
        </span>
      )}
      
      {/* Current digit rolling in */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isRolling && "animate-odometer-enter"
        )}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        {currentChar}
      </span>
    </span>
  );
}

/**
 * AnimatedXP - Specialized component for XP display with "XP" suffix
 */
interface AnimatedXPProps {
  value: number;
  className?: string;
  showPlus?: boolean;
  duration?: number;
}

export function AnimatedXP({ 
  value, 
  className, 
  showPlus = false,
  duration = 800 
}: AnimatedXPProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      {showPlus && value > 0 && <span className="opacity-70">+</span>}
      <AnimatedNumber value={value} duration={duration} />
      <span className="text-muted-foreground text-[0.75em] ml-0.5">XP</span>
    </span>
  );
}

/**
 * AnimatedLevel - Displays rank letter + sublevel with smooth odometer animation
 */
interface AnimatedLevelProps {
  letter: string;
  sublevel: number;
  className?: string;
  letterClassName?: string;
  sublevelClassName?: string;
}

export function AnimatedLevel({
  letter,
  sublevel,
  className,
  letterClassName,
  sublevelClassName,
}: AnimatedLevelProps) {
  const [currentLetter, setCurrentLetter] = useState(letter);
  const [previousLetter, setPreviousLetter] = useState<string | null>(null);
  const [isLetterRolling, setIsLetterRolling] = useState(false);
  
  const [currentSublevel, setCurrentSublevel] = useState(sublevel);
  const [previousSublevel, setPreviousSublevel] = useState<number | null>(null);
  const [isSublevelRolling, setIsSublevelRolling] = useState(false);
  
  const prevLetterRef = useRef(letter);
  const prevSublevelRef = useRef(sublevel);

  // Handle letter changes
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

  // Handle sublevel changes
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
    <span className={cn("inline-flex items-baseline", className)}>
      {/* Letter with odometer effect */}
      <span 
        className={cn(
          "relative inline-block overflow-hidden",
          letterClassName
        )}
        style={{ 
          width: '0.7em',
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
        className={cn(
          "relative inline-block overflow-hidden",
          sublevelClassName
        )}
        style={{ 
          width: '0.55em',
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
