"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, FileImage, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif";

export type FileDropProps = {
  label: string;
  sublabel?: string;
  value: File | null;
  onChange: (f: File | null) => void;
  accent?: "main" | "sample";
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileDrop({
  label,
  sublabel,
  value,
  onChange,
  accent = "main",
}: FileDropProps) {
  const [drag, setDrag] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (f: File | null) => {
      onChange(f);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (f && f.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(f));
      } else {
        setPreviewUrl(null);
      }
    },
    [onChange, previewUrl]
  );

  const isImage = value?.type.startsWith("image/");
  const isPdf = value?.type === "application/pdf";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-1.5 rounded-full",
              accent === "main" ? "bg-emerald-400" : "bg-sky-400"
            )}
          />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {sublabel && (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handle(f);
        }}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/40 px-4 py-8 cursor-pointer transition-colors min-h-[180px]",
          drag && "border-foreground/60 bg-card",
          value && "border-solid"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => handle(e.target.files?.[0] ?? null)}
        />

        {!value && (
          <>
            <span className="size-10 rounded-full border border-border flex items-center justify-center bg-background/40">
              <Upload className="size-4 text-muted-foreground" />
            </span>
            <div className="text-center">
              <div className="text-sm">Drop a file or click to choose</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                PDF, PNG, JPEG, WEBP — up to 20 MB
              </div>
            </div>
          </>
        )}

        {value && (
          <div className="flex w-full items-center gap-3">
            <div className="size-14 shrink-0 rounded-md border border-border overflow-hidden bg-background/60 flex items-center justify-center">
              {isImage && previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={value.name}
                  className="size-full object-cover"
                />
              ) : isPdf ? (
                <FileText className="size-6 text-muted-foreground" />
              ) : (
                <FileImage className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{value.name}</div>
              <div className="text-xs text-muted-foreground">
                {value.type || "unknown"} · {formatBytes(value.size)}
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={(e) => {
                e.preventDefault();
                handle(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Remove file"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
      </label>
    </div>
  );
}
