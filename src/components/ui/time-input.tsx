"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TimeFormat = "seconds" | "mm:ss" | "hh:mm:ss";

interface TimeInputProps {
  value: number | undefined; // Value in seconds
  onChange: (seconds: number) => void;
  format: TimeFormat;
  className?: string;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  "data-grade-row"?: number;
  "data-grade-col"?: number;
}

/**
 * Parse a time string in various formats to total seconds
 */
export function parseTimeToSeconds(timeStr: string, format: TimeFormat): number {
  if (!timeStr || timeStr.trim() === "") return 0;
  
  const cleaned = timeStr.trim();
  
  if (format === "seconds") {
    return parseFloat(cleaned) || 0;
  }
  
  // Handle mm:ss or hh:mm:ss
  const parts = cleaned.split(":").map(p => parseInt(p) || 0);
  
  if (format === "mm:ss") {
    if (parts.length === 1) {
      // Just seconds
      return parts[0];
    } else if (parts.length >= 2) {
      // mm:ss
      return parts[0] * 60 + parts[1];
    }
  }
  
  if (format === "hh:mm:ss") {
    if (parts.length === 1) {
      // Just seconds
      return parts[0];
    } else if (parts.length === 2) {
      // mm:ss
      return parts[0] * 60 + parts[1];
    } else if (parts.length >= 3) {
      // hh:mm:ss
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  
  return 0;
}

/**
 * Format seconds into a display string
 */
export function formatSecondsToTime(seconds: number, format: TimeFormat): string {
  if (!seconds || seconds <= 0) return "";
  
  if (format === "seconds") {
    return seconds.toString();
  }
  
  const totalSeconds = Math.round(seconds);
  
  if (format === "mm:ss") {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  
  if (format === "hh:mm:ss") {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
  }
  
  return seconds.toString();
}

/**
 * Time input component that handles different time formats
 * Stores value in seconds internally
 */
export function TimeInput({ 
  value, 
  onChange, 
  format, 
  className, 
  placeholder,
  onKeyDown,
  "data-grade-row": dataGradeRow,
  "data-grade-col": dataGradeCol,
}: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  
  // Update display when value or format changes
  useEffect(() => {
    if (value !== undefined && value > 0) {
      setDisplayValue(formatSecondsToTime(value, format));
    } else {
      setDisplayValue("");
    }
  }, [value, format]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);
  }, []);

  const handleBlur = useCallback(() => {
    const seconds = parseTimeToSeconds(displayValue, format);
    onChange(seconds);
    // Reformat the display
    if (seconds > 0) {
      setDisplayValue(formatSecondsToTime(seconds, format));
    } else {
      setDisplayValue("");
    }
  }, [displayValue, format, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      // Commit the value before navigation
      const seconds = parseTimeToSeconds(displayValue, format);
      onChange(seconds);
      if (seconds > 0) {
        setDisplayValue(formatSecondsToTime(seconds, format));
      } else {
        setDisplayValue("");
      }
    }
    onKeyDown?.(e);
  }, [displayValue, format, onChange, onKeyDown]);

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (format) {
      case "mm:ss": return "0:00";
      case "hh:mm:ss": return "0:00:00";
      default: return "—";
    }
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={getPlaceholder()}
      className={cn("text-center", className)}
      data-grade-row={dataGradeRow}
      data-grade-col={dataGradeCol}
    />
  );
}

/**
 * Get format label for display
 */
export function getTimeFormatLabel(format: TimeFormat): string {
  switch (format) {
    case "seconds": return "Seconds";
    case "mm:ss": return "Minutes:Seconds (mm:ss)";
    case "hh:mm:ss": return "Hours:Minutes:Seconds (hh:mm:ss)";
    default: return "Seconds";
  }
}

export const TIME_FORMATS: { value: TimeFormat; label: string }[] = [
  { value: "seconds", label: "Seconds (e.g., 180)" },
  { value: "mm:ss", label: "Minutes:Seconds (e.g., 3:00)" },
  { value: "hh:mm:ss", label: "Hours:Minutes:Seconds (e.g., 1:30:00)" },
];
