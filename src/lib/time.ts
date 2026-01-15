/**
 * Time formatting utilities - server-compatible
 * These are pure functions that work on both server and client
 */

export type TimeFormat = "seconds" | "mm:ss" | "hh:mm:ss";

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
