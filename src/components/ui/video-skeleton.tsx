import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface VideoSkeletonProps {
  className?: string;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "9/16";
}

/**
 * Loading skeleton for video players.
 * Use as a Suspense fallback when loading video components.
 */
export function VideoSkeleton({ className, aspectRatio = "16/9" }: VideoSkeletonProps) {
  return (
    <div 
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-muted",
        className
      )}
      style={{ aspectRatio }}
    >
      <Skeleton className="absolute inset-0 w-full h-full" />
      
      {/* Fake play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-black/60 backdrop-blur-sm p-4 animate-pulse border border-white/20">
          <Play className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Fake progress bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <Skeleton className="h-1 w-full rounded-full" />
        <div className="flex items-center justify-between mt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </div>
  );
}
