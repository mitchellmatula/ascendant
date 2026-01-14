"use client";

import { useState, useRef, useCallback } from "react";
import { Video, Upload, X, Loader2, AlertCircle, Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  value?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number; // Max file size in MB (after compression)
  maxDurationSeconds?: number; // Max video duration
  aspectRatio?: "16:9" | "9:16" | "1:1" | "any";
  disabled?: boolean;
  className?: string;
  uploadEndpoint?: string; // API endpoint for upload
  enableCompression?: boolean; // Enable client-side compression
  compressionThresholdMB?: number; // Compress if file is larger than this
}

interface UploadState {
  status: "idle" | "compressing" | "uploading" | "error" | "success";
  progress: number;
  error?: string;
}

export function VideoUpload({
  value,
  onUpload,
  onRemove,
  maxSizeMB = 50,
  maxDurationSeconds = 120,
  aspectRatio = "any",
  disabled = false,
  className,
  uploadEndpoint = "/api/upload/video",
  enableCompression = true,
  compressionThresholdMB = 10,
}: VideoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalMB: number;
    compressedMB: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Validate video file
  const validateVideo = useCallback(
    (file: File): Promise<{ valid: boolean; error?: string; duration?: number }> => {
      return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);

          // Check duration
          if (video.duration > maxDurationSeconds) {
            resolve({
              valid: false,
              error: `Video is too long. Maximum ${maxDurationSeconds} seconds allowed.`,
            });
            return;
          }

          // Check file size (before compression)
          const sizeMB = file.size / (1024 * 1024);
          if (sizeMB > maxSizeMB * 3) {
            // Allow 3x for compression headroom
            resolve({
              valid: false,
              error: `Video file is too large (${sizeMB.toFixed(1)}MB). Maximum ${maxSizeMB * 3}MB before compression.`,
            });
            return;
          }

          resolve({ valid: true, duration: video.duration });
        };

        video.onerror = () => {
          resolve({ valid: false, error: "Invalid video file" });
        };

        video.src = URL.createObjectURL(file);
      });
    },
    [maxDurationSeconds, maxSizeMB]
  );

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setUploadState({ status: "idle", progress: 0 });

    // Validate
    const validation = await validateVideo(file);
    if (!validation.valid) {
      setUploadState({ status: "error", progress: 0, error: validation.error });
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Start upload process
    await uploadVideo(file);

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload video (with optional compression)
  const uploadVideo = async (file: File) => {
    try {
      let fileToUpload = file;
      const originalSizeMB = file.size / (1024 * 1024);

      // Compress if enabled and file is large enough
      if (enableCompression && originalSizeMB > compressionThresholdMB) {
        setUploadState({ status: "compressing", progress: 0 });
        
        try {
          // Dynamic import to avoid loading FFmpeg until needed
          const { compressVideo } = await import("@/lib/video-compression");
          
          const result = await compressVideo(file, {
            maxWidth: 1280,
            maxHeight: 720,
            videoBitrate: "1M",
            onProgress: (progress) => {
              setUploadState({ status: "compressing", progress: progress * 0.5 }); // 0-50%
            },
          });
          
          fileToUpload = result.file;
          setCompressionStats({
            originalMB: originalSizeMB,
            compressedMB: result.compressedSize / (1024 * 1024),
          });
        } catch (compressionError) {
          console.warn("Compression failed, uploading original:", compressionError);
          // Fall back to original file if compression fails
        }
      }

      setUploadState({ status: "uploading", progress: 50 });

      const formData = new FormData();
      formData.append("file", fileToUpload);

      // Use XMLHttpRequest for real progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ url: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const uploadProgress = (event.loaded / event.total) * 50; // 50-100%
            setUploadState({ status: "uploading", progress: 50 + uploadProgress });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch {
              reject(new Error("Invalid response"));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
      });

      xhr.open("POST", uploadEndpoint);
      xhr.send(formData);

      const data = await uploadPromise;

      setUploadState({ status: "success", progress: 100 });
      onUpload(data.url);

      // Clean up preview after successful upload
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (error) {
      setUploadState({
        status: "error",
        progress: 0,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  // Handle remove
  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadState({ status: "idle", progress: 0 });
    onRemove?.();
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isProcessing = uploadState.status === "compressing" || uploadState.status === "uploading";
  const displayUrl = value || previewUrl;

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
        onChange={handleFileSelect}
        disabled={disabled || isProcessing}
        className="hidden"
      />

      {displayUrl ? (
        // Video preview
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={displayUrl}
            controls
            playsInline
            className={cn(
              "w-full max-h-[300px] object-contain",
              aspectRatio === "9:16" && "aspect-[9/16]",
              aspectRatio === "16:9" && "aspect-video",
              aspectRatio === "1:1" && "aspect-square"
            )}
          />
          {!isProcessing && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        // Upload zone
        <div
          onClick={!disabled && !isProcessing ? triggerFileInput : undefined}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
            !disabled && !isProcessing && "cursor-pointer hover:border-primary hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed",
            uploadState.status === "error" && "border-destructive"
          )}
        >
          <Video className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Upload Video</p>
          <p className="text-xs text-muted-foreground mt-1">
            MP4, MOV, or WebM • Max {maxDurationSeconds}s • Max {maxSizeMB}MB
          </p>
        </div>
      )}

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {uploadState.status === "compressing" ? (
              <Zap className="h-4 w-4 text-amber-500" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span className="text-sm">
              {uploadState.status === "compressing" 
                ? "Compressing video..." 
                : "Uploading..."}
            </span>
          </div>
          <Progress value={uploadState.progress} className="h-2" />
          {uploadState.status === "compressing" && (
            <p className="text-xs text-muted-foreground">
              This may take a moment for larger videos
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {uploadState.status === "error" && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {uploadState.error}
        </div>
      )}

      {/* Success message with compression stats */}
      {uploadState.status === "success" && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Play className="h-4 w-4" />
            Video uploaded successfully
          </div>
          {compressionStats && (
            <p className="text-xs text-muted-foreground">
              Compressed: {compressionStats.originalMB.toFixed(1)}MB → {compressionStats.compressedMB.toFixed(1)}MB 
              ({Math.round((1 - compressionStats.compressedMB / compressionStats.originalMB) * 100)}% smaller)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
