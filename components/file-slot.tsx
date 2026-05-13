"use client";

import { useRef } from "react";
import { Replace, X } from "lucide-react";
import { FileDrop } from "@/components/file-drop";
import { FilePreview } from "@/components/file-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT =
  "application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif";

export type FileSlotProps = {
  label: string;
  sublabel?: string;
  accent?: "main" | "sample";
  file: File | null;
  onChange: (f: File | null) => void;
  compact?: boolean;
  disabled?: boolean;
};

export function FileSlot({
  label,
  sublabel,
  accent = "main",
  file,
  onChange,
  compact = false,
  disabled = false,
}: FileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!file) {
    return (
      <FileDrop
        label={label}
        sublabel={sublabel}
        value={file}
        onChange={onChange}
        accent={accent}
      />
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            if (next) onChange(next);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="h-7 backdrop-blur-md bg-background/70"
        >
          <Replace className="size-3.5" />
          Replace
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="backdrop-blur-md bg-background/70"
          aria-label="Remove file"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <FilePreview
        label={label}
        accent={accent}
        file={file}
        className={cn(compact && "min-h-[260px]")}
      />
    </div>
  );
}
