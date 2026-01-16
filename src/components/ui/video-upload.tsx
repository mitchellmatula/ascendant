"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Video, Upload, X, Loader2, AlertCircle, Play, Zap, Library, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VideoUploadProps {
  value?: string | null;
  onUpload: (url: string, videoId?: string | null) => void;
  onRemove?: () => void;
  maxSizeMB?: number; // Max file size in MB (after compression)
  maxDurationSeconds?: number; // Max video duration
  aspectRatio?: "16:9" | "9:16" | "1:1" | "any";
  disabled?: boolean;
  className?: string;
  uploadEndpoint?: string; // API endpoint for upload
  enableCompression?: boolean; // Enable client-side compression
  compressionThresholdMB?: number; // Compress if file is larger than this
  athleteId?: string; // Required for saving to library
  requireTitle?: boolean; // Require title before upload
  showLibrary?: boolean; // Show option to select from library
}

interface UploadState {
  status: "idle" | "compressing" | "uploading" | "error" | "success";
  progress: number;
  error?: string;
}

interface LibraryVideo {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  duration?: number | null;
  fileSize?: number | null;
}

export function VideoUpload({
  value,
  onUpload,
  onRemove,
  maxSizeMB = 250,
  maxDurationSeconds = 120,
  aspectRatio = "any",
  disabled = false,
  className,
  uploadEndpoint = "/api/upload/video",
  enableCompression = true,
  compressionThresholdMB = 10,
  athleteId,
  requireTitle = true,
  showLibrary = true,
}: VideoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [compressionStats, setCompressionStats] = useState<{
    originalMB: number;
    compressedMB: number;
  } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch library videos when dialog opens
  useEffect(() => {
    if (libraryOpen && athleteId) {
      fetchLibraryVideos();
    }
  }, [libraryOpen, athleteId]);

  const fetchLibraryVideos = async () => {
    if (!athleteId) return;
    setLoadingLibrary(true);
    try {
      const params = new URLSearchParams({ athleteId });
      if (librarySearch) params.append("search", librarySearch);
      
      const response = await fetch(`/api/videos?${params}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setLibraryVideos(data.videos || []);
      }
    } catch (error) {
      console.error("Failed to fetch library videos:", error);
    } finally {
      setLoadingLibrary(false);
    }
  };

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

  // Handle file selection - now just stores the file and shows title input
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setUploadState({ status: "idle", progress: 0 });
    setVideoTitle("");

    // Validate
    const validation = await validateVideo(file);
    if (!validation.valid) {
      setUploadState({ status: "error", progress: 0, error: validation.error });
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setPendingFile(file);

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Start upload after title is set
  const startUpload = async () => {
    if (!pendingFile) return;
    if (requireTitle && !videoTitle.trim()) {
      setUploadState({ status: "error", progress: 0, error: "Please enter a title for this video" });
      return;
    }
    await uploadVideo(pendingFile);
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
      if (videoTitle.trim()) {
        formData.append("title", videoTitle.trim());
      }
      if (athleteId) {
        formData.append("athleteId", athleteId);
        formData.append("saveToLibrary", "true");
      }

      // Use XMLHttpRequest for real progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ url: string; videoId?: string | null }>((resolve, reject) => {
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
      xhr.withCredentials = true; // Send cookies for authentication
      xhr.send(formData);

      const data = await uploadPromise;

      setUploadState({ status: "success", progress: 100 });
      setPendingFile(null);
      onUpload(data.url, data.videoId);

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

  // Handle selecting from library
  const handleSelectFromLibrary = (video: LibraryVideo) => {
    onUpload(video.url, video.id);
    setLibraryOpen(false);
  };

  // Handle remove
  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPendingFile(null);
    setVideoTitle("");
    setUploadState({ status: "idle", progress: 0 });
    onRemove?.();
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isProcessing = uploadState.status === "compressing" || uploadState.status === "uploading";
  const displayUrl = value || previewUrl;
  const showTitleInput = pendingFile && !value && uploadState.status !== "success";

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
          {!isProcessing && !showTitleInput && (
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
        // Library-first approach: click opens library dialog with upload option
        <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
          <DialogTrigger asChild>
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                !disabled && !isProcessing && "cursor-pointer hover:border-primary hover:bg-muted/50",
                disabled && "opacity-50 cursor-not-allowed",
                uploadState.status === "error" && "border-destructive"
              )}
            >
              {showLibrary && athleteId ? (
                <>
                  <Library className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Add Video</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose from library or upload new
                  </p>
                </>
              ) : (
                <>
                  <Video className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Upload Video</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP4, MOV, or WebM • Max {Math.floor(maxDurationSeconds / 60)}min • Max {maxSizeMB}MB
                  </p>
                </>
              )}
            </div>
          </DialogTrigger>
          
          {showLibrary && athleteId ? (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Select Video</DialogTitle>
                <DialogDescription>
                  Choose from your library or upload a new video
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Upload New button at top */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setLibraryOpen(false);
                    setTimeout(() => triggerFileInput(), 100);
                  }}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload New Video
                </Button>

                {/* Divider */}
                {libraryVideos.length > 0 && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        or choose from library
                      </span>
                    </div>
                  </div>
                )}

                {/* Search */}
                {libraryVideos.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search videos..."
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchLibraryVideos()}
                      className="pl-9"
                    />
                  </div>
                )}

                {/* Video list */}
                <ScrollArea className="h-[300px]">
                  {loadingLibrary ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : libraryVideos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No videos in your library yet</p>
                      <p className="text-xs mt-1">Upload your first video above</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {libraryVideos.map((video) => (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => handleSelectFromLibrary(video)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="w-16 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Play className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{video.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(video.createdAt).toLocaleDateString()}
                              {video.fileSize && ` • ${(video.fileSize / (1024 * 1024)).toFixed(1)}MB`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          ) : (
            // No library - clicking the trigger should just open file picker
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Upload Video</DialogTitle>
                <DialogDescription>
                  Select a video file to upload
                </DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setLibraryOpen(false);
                  setTimeout(() => triggerFileInput(), 100);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                MP4, MOV, or WebM • Max {Math.floor(maxDurationSeconds / 60)}min • Max {maxSizeMB}MB
              </p>
            </DialogContent>
          )}
        </Dialog>
      )}

      {/* Title input (shown after file selection, before upload) */}
      {showTitleInput && (
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="video-title">Video Title {requireTitle && <span className="text-destructive">*</span>}</Label>
            <Input
              id="video-title"
              placeholder="e.g., 5K Run - Central Park"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              disabled={isProcessing}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Give this video a short title so you can find it later
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={startUpload}
              disabled={isProcessing || (requireTitle && !videoTitle.trim())}
              className="flex-1"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? "Processing..." : "Upload Video"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
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
