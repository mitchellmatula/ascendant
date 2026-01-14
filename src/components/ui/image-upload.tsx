"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { ImagePlus, X, Loader2, Check, ZoomOut, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  uploadEndpoint: string;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  aspectRatio?: number; // e.g., 1 for square, 16/9 for widescreen
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImage(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  zoom: number
): Promise<File> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Account for zoom - the displayed image is scaled, so we need to adjust
  const zoomFactor = zoom / 100;
  const scaleX = image.naturalWidth / (image.width * zoomFactor);
  const scaleY = image.naturalHeight / (image.height * zoomFactor);

  // Set canvas size to crop dimensions (at natural resolution)
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const file = new File([blob], fileName, { type: "image/jpeg" });
        resolve(file);
      },
      "image/jpeg",
      0.9
    );
  });
}

export function ImageUpload({
  currentImageUrl,
  onUpload,
  onRemove,
  uploadEndpoint,
  maxSizeMB = 5,
  disabled = false,
  className,
  aspectRatio = 1, // Default to square
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cropping state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("");
  const [zoom, setZoom] = useState(100); // 100 = original size, lower = zoomed out

  const displayImage = preview || currentImageUrl;

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be less than ${maxSizeMB}MB`);
      return;
    }

    // Store filename and open crop dialog
    setOriginalFileName(file.name);
    setZoom(100); // Reset zoom for new image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) {
      setError("Please select a crop area");
      return;
    }

    setCropDialogOpen(false);
    setIsUploading(true);

    try {
      // Get cropped image as file
      const croppedFile = await getCroppedImage(
        imgRef.current,
        completedCrop,
        originalFileName.replace(/\.[^/.]+$/, ".jpg"),
        zoom
      );

      // Show preview
      const previewUrl = URL.createObjectURL(croppedFile);
      setPreview(previewUrl);

      // Upload cropped image
      const response = await fetch(
        `${uploadEndpoint}?filename=${encodeURIComponent(croppedFile.name)}`,
        {
          method: "POST",
          body: croppedFile,
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      onUpload(data.url);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image");
      setPreview(null);
    } finally {
      setIsUploading(false);
      setImageToCrop(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onRemove?.();
  };

  return (
    <>
    <div className={cn("flex items-center gap-3", className)}>
      {displayImage ? (
        <div className="relative h-16 w-16 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
          <Image
            src={displayImage}
            alt="Uploaded"
            fill
            className="object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center flex-shrink-0">
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="h-8"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Uploading...
              </>
            ) : displayImage ? (
              "Change"
            ) : (
              "Upload"
            )}
          </Button>
          {displayImage && onRemove && !isUploading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="h-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP • Max {maxSizeMB}MB
          </p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>

    {/* Crop Dialog */}
    <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCropCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
          <DialogDescription>
            Adjust the crop area. Use the slider to zoom out if needed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          {/* Zoom slider */}
          <div className="flex items-center gap-3 px-1">
            <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={30}
              max={100}
              step={5}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Crop area */}
          <div className="flex justify-center overflow-hidden rounded-lg bg-muted/50 p-2">
            {imageToCrop && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                className="max-h-[50vh]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imageToCrop}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ 
                    maxHeight: "50vh", 
                    width: "auto",
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "center center"
                  }}
                />
              </ReactCrop>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCropCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCropConfirm}>
            <Check className="h-4 w-4 mr-1.5" />
            Crop & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
