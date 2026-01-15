"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Camera, User, ZoomIn, ZoomOut, Check, X } from "lucide-react";
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

interface AvatarUploadProps {
  currentImageUrl?: string | null;
  onImageSelect: (file: File) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

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

export function AvatarUpload({
  currentImageUrl,
  onImageSelect,
  size = "lg",
  disabled = false,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropping state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("");
  const [zoom, setZoom] = useState(100);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, 1)); // 1:1 aspect ratio
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    // Store original file name
    setOriginalFileName(file.name.replace(/\.[^/.]+$/, "") + "_avatar.jpg");

    // Create preview and open crop dialog
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setZoom(100);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedFile = await getCroppedImage(
        imgRef.current,
        completedCrop,
        originalFileName,
        zoom
      );

      // Create preview from cropped file
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setImageError(false);
      };
      reader.readAsDataURL(croppedFile);

      onImageSelect(croppedFile);
      setCropDialogOpen(false);
      setImageToCrop(null);
    } catch (error) {
      console.error("Error cropping image:", error);
      alert("Failed to crop image. Please try again.");
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setImageToCrop(null);
  };

  const displayImage = preview || currentImageUrl;
  const showImage = displayImage && !imageError;

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "relative rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors",
            sizeClasses[size],
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {showImage ? (
            <Image
              src={displayImage}
              alt="Avatar"
              fill
              className="object-cover"
              unoptimized={displayImage.includes("blob.vercel-storage.com")}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <User className="h-1/2 w-1/2 text-muted-foreground" />
            </div>
          )}

          {/* Camera overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <p className="text-xs text-muted-foreground text-center">
          Click to upload a photo
        </p>
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Avatar</DialogTitle>
            <DialogDescription>
              Adjust the crop area for your profile picture
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Crop area */}
            <div className="flex justify-center bg-muted/50 rounded-lg p-4 overflow-hidden">
              {imageToCrop && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={imageToCrop}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{
                      maxHeight: "400px",
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "center",
                    }}
                  />
                </ReactCrop>
              )}
            </div>

            {/* Zoom control */}
            <div className="flex items-center gap-3 px-2">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={50}
                max={150}
                step={5}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCropCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleCropConfirm}>
              <Check className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
