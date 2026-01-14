"use client";

import { VideoEmbed, isEmbeddableVideoUrl, isDirectVideoUrl } from "@/components/ui/video-embed";
import { VideoPlayer } from "@/components/ui/video-player";
import { cn } from "@/lib/utils";

interface VideoDisplayProps {
  url?: string | null;
  fallbackImageUrl?: string | null;
  className?: string;
  title?: string;
}

/**
 * Smart video display component that automatically chooses between:
 * - VideoEmbed for YouTube/Vimeo URLs
 * - VideoPlayer for direct video files (mp4, webm, etc.)
 */
export function VideoDisplay({ url, fallbackImageUrl, className, title = "Video" }: VideoDisplayProps) {
  if (!url) {
    if (fallbackImageUrl) {
      return (
        <div 
          className={cn("relative w-full overflow-hidden rounded-lg bg-muted", className)}
          style={{ aspectRatio: "16/9" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fallbackImageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return null;
  }

  // Check if it's an embeddable URL (YouTube/Vimeo)
  if (isEmbeddableVideoUrl(url)) {
    return <VideoEmbed url={url} className={className} title={title} />;
  }

  // Check if it's a direct video URL
  if (isDirectVideoUrl(url)) {
    return (
      <VideoPlayer 
        src={url} 
        className={className}
        poster={fallbackImageUrl || undefined}
      />
    );
  }

  // Fallback - try as direct video (might be a blob URL or other format)
  return (
    <VideoPlayer 
      src={url} 
      className={className}
      poster={fallbackImageUrl || undefined}
    />
  );
}
