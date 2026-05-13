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
    <FilePreview
      label={label}
      accent={accent}
      file={file}
      className={cn(compact && "min-h-[300px]")}
      actions={
        <>
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
            size="xs"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Replace className="size-3" />
            Replace
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Remove file"
          >
            <X className="size-3" />
          </Button>
        </>
      }
    />
  );
}
