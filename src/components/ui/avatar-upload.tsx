"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, User } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function AvatarUpload({
  currentImageUrl,
  onImageSelect,
  size = "lg",
  disabled = false,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setImageError(false);
      };
      reader.readAsDataURL(file);

      onImageSelect(file);
    }
  };

  const displayImage = preview || currentImageUrl;
  const showImage = displayImage && !imageError;

  return (
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
  );
}
