"use client";

import { cn } from "@/lib/utils";

interface VideoEmbedProps {
  url: string;
  className?: string;
  aspectRatio?: "16/9" | "4/3" | "1/1";
  title?: string;
}

/**
 * Extracts video ID and platform from various video URLs
 */
export function parseVideoUrl(url: string): { platform: "youtube" | "vimeo" | "unknown"; videoId: string | null } {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { platform: "youtube", videoId: match[1] };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { platform: "vimeo", videoId: match[1] };
    }
  }

  return { platform: "unknown", videoId: null };
}

/**
 * Get the thumbnail URL for a video
 * YouTube: Direct URL available
 * Vimeo: Requires fetching from their oEmbed API
 */
export function getVideoThumbnailUrl(url: string): string | null {
  const { platform, videoId } = parseVideoUrl(url);
  
  if (platform === "youtube" && videoId) {
    // YouTube provides multiple quality options:
    // maxresdefault.jpg (1280x720) - may not exist for all videos
    // sddefault.jpg (640x480)
    // hqdefault.jpg (480x360)
    // mqdefault.jpg (320x180)
    // default.jpg (120x90)
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  
  // Vimeo requires an API call - return null and handle async
  return null;
}

/**
 * Fetch Vimeo thumbnail asynchronously via their oEmbed API
 */
export async function fetchVimeoThumbnail(url: string): Promise<string | null> {
  const { platform, videoId } = parseVideoUrl(url);
  
  if (platform !== "vimeo" || !videoId) {
    return null;
  }
  
  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    // Get highest quality thumbnail by modifying the URL
    // Vimeo thumbnails can have _640, _1280 etc suffixes
    let thumbnailUrl = data.thumbnail_url as string;
    if (thumbnailUrl) {
      // Try to get higher resolution
      thumbnailUrl = thumbnailUrl.replace(/_\d+x\d+/, "_1280x720");
    }
    return thumbnailUrl || null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is an embeddable video (YouTube/Vimeo)
 */
export function isEmbeddableVideoUrl(url: string): boolean {
  const { platform, videoId } = parseVideoUrl(url);
  return platform !== "unknown" && videoId !== null;
}

/**
 * Check if URL is a direct video file (mp4, webm, etc.)
 */
export function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov"];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.includes(ext));
}

export function VideoEmbed({ url, className, aspectRatio = "16/9", title = "Video" }: VideoEmbedProps) {
  const { platform, videoId } = parseVideoUrl(url);

  if (platform === "unknown" || !videoId) {
    return (
      <div className={cn("bg-muted rounded-lg flex items-center justify-center p-4", className)}>
        <p className="text-sm text-muted-foreground">Unable to embed video from this URL</p>
      </div>
    );
  }

  const embedUrl = platform === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
    : `https://player.vimeo.com/video/${videoId}?byline=0&portrait=0`;

  return (
    <div 
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-black",
        className
      )}
      style={{ aspectRatio }}
    >
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}
