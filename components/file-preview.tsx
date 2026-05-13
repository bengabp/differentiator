"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, FileImage, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export type FilePreviewProps = {
  label: string;
  accent?: "main" | "sample";
  file: File | null;
  className?: string;
};

export function FilePreview({ label, accent = "main", file, className }: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const kind = useMemo<"pdf" | "image" | "other" | "empty">(() => {
    if (!file) return "empty";
    if (file.type === "application/pdf") return "pdf";
    if (file.type.startsWith("image/")) return "image";
    return "other";
  }, [file]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card/40 overflow-hidden min-h-[400px]",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/60">
        <span
          className={cn(
            "size-1.5 rounded-full",
            accent === "main" ? "bg-emerald-400" : "bg-sky-400"
          )}
        />
        <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          {label}
        </span>
        {file && (
          <span className="ml-auto text-xs text-muted-foreground truncate max-w-[60%]">
            {file.name} · {formatBytes(file.size)}
          </span>
        )}
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        {kind === "empty" && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-8 text-center">
            <FileQuestion className="size-8" />
            <p className="text-sm">No file uploaded yet</p>
            <p className="text-xs">Add one from the Compare view.</p>
          </div>
        )}

        {kind === "image" && url && (
          <>
            {!loaded && (
              <div className="absolute inset-0 animate-pulse bg-muted/40" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={file?.name ?? ""}
              onLoad={() => setLoaded(true)}
              className={cn(
                "max-h-[640px] max-w-full object-contain transition-opacity duration-200",
                loaded ? "opacity-100" : "opacity-0"
              )}
            />
          </>
        )}

        {kind === "pdf" && url && (
          <iframe
            src={url}
            title={file?.name ?? "PDF preview"}
            className="size-full min-h-[640px] bg-white"
          />
        )}

        {kind === "other" && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-8 text-center">
            {file?.type.startsWith("image/") ? (
              <FileImage className="size-8" />
            ) : (
              <FileText className="size-8" />
            )}
            <p className="text-sm">Preview not available for this type.</p>
            <p className="text-xs">
              {file?.type} · {file ? formatBytes(file.size) : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
