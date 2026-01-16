"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Dynamically import to avoid SSR issues
const Picker = dynamic(
  () => import("emoji-picker-react"),
  { ssr: false }
);

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
  disabled?: boolean;
}

export function EmojiPicker({ value, onChange, className, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = useCallback((emojiData: { emoji: string }) => {
    onChange(emojiData.emoji);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          disabled={disabled}
          className={cn(
            "w-16 h-16 text-3xl p-0 flex items-center justify-center",
            className
          )}
        >
          {value || "😀"}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-0" 
        align="start"
        sideOffset={8}
      >
        <Picker
          onEmojiClick={handleEmojiClick}
          autoFocusSearch
          lazyLoadEmojis
          skinTonesDisabled={false}
          searchPlaceholder="Search emojis..."
          previewConfig={{
            showPreview: true,
          }}
          height={400}
          width={350}
        />
      </PopoverContent>
    </Popover>
  );
}
