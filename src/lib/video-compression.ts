/**
 * Client-side video compression using FFmpeg.wasm
 * 
 * This compresses videos before upload to:
 * 1. Reduce upload time
 * 2. Save storage costs
 * 3. Ensure consistent quality/format
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Load FFmpeg WASM (lazy, singleton)
 */
async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  if (isLoading && loadPromise) {
    await loadPromise;
    return ffmpeg!;
  }

  isLoading = true;
  ffmpeg = new FFmpeg();

  loadPromise = (async () => {
    // Load from CDN for better caching
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    
    await ffmpeg!.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
  })();

  await loadPromise;
  isLoading = false;
  return ffmpeg;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  videoBitrate?: string; // e.g., "1M" for 1 Mbps
  audioBitrate?: string; // e.g., "128k"
  fps?: number;
  format?: "mp4" | "webm";
  onProgress?: (progress: number) => void;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
}

/**
 * Compress a video file
 */
export async function compressVideo(
  inputFile: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    videoBitrate = "1M",
    audioBitrate = "128k",
    fps = 30,
    format = "mp4",
    onProgress,
  } = options;

  const startTime = Date.now();
  const originalSize = inputFile.size;

  // Load FFmpeg
  const ff = await loadFFmpeg();

  // Set up progress handler
  if (onProgress) {
    ff.on("progress", ({ progress }) => {
      onProgress(Math.min(progress * 100, 99));
    });
  }

  // Write input file to FFmpeg virtual filesystem
  const inputName = `input.${inputFile.name.split(".").pop() || "mp4"}`;
  const outputName = `output.${format}`;
  
  await ff.writeFile(inputName, await fetchFile(inputFile));

  // Build FFmpeg command
  // -i: input file
  // -vf: video filters (scale to max dimensions while maintaining aspect ratio)
  // -b:v: video bitrate
  // -b:a: audio bitrate
  // -r: frame rate
  // -c:v: video codec (libx264 for mp4, libvpx-vp9 for webm)
  // -c:a: audio codec (aac for mp4, libopus for webm)
  // -preset: encoding speed/quality tradeoff
  // -movflags: put metadata at start for streaming
  
  const scaleFilter = `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`;
  
  const args = [
    "-i", inputName,
    "-vf", scaleFilter,
    "-b:v", videoBitrate,
    "-b:a", audioBitrate,
    "-r", fps.toString(),
    "-c:v", format === "mp4" ? "libx264" : "libvpx-vp9",
    "-c:a", format === "mp4" ? "aac" : "libopus",
    "-preset", "fast",
    "-movflags", "+faststart",
    "-y", // Overwrite output
    outputName,
  ];

  await ff.exec(args);

  // Read output file - readFile returns Uint8Array for binary files
  const outputData = await ff.readFile(outputName) as Uint8Array;
  // Use slice() to create a proper ArrayBuffer that's compatible with Blob
  const outputBlob = new Blob([outputData.slice().buffer], { 
    type: format === "mp4" ? "video/mp4" : "video/webm" 
  });
  
  const compressedFile = new File(
    [outputBlob], 
    `${inputFile.name.split(".")[0]}_compressed.${format}`,
    { type: outputBlob.type }
  );

  // Clean up
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const compressedSize = compressedFile.size;
  const duration = (Date.now() - startTime) / 1000;

  onProgress?.(100);

  return {
    file: compressedFile,
    originalSize,
    compressedSize,
    compressionRatio: originalSize / compressedSize,
    duration,
  };
}

/**
 * Check if compression is needed based on file size
 */
export function shouldCompress(file: File, maxSizeMB: number = 10): boolean {
  const sizeMB = file.size / (1024 * 1024);
  return sizeMB > maxSizeMB;
}

/**
 * Get video metadata (duration, dimensions) without full load
 */
export function getVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video metadata"));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Generate a thumbnail from a video at a specific time
 */
export async function generateThumbnail(
  file: File,
  timeSeconds: number = 0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }
    
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeSeconds, video.duration);
    };
    
    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(video.src);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to generate thumbnail"));
        }
      }, "image/jpeg", 0.8);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video"));
    };
    
    video.src = URL.createObjectURL(file);
  });
}
