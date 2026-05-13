"use client";

import Link from "next/link";
import { Sparkles, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsDialog } from "@/lib/settings-dialog";

export function SiteHeader() {
  const { show } = useSettingsDialog();
  return (
    <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-40 bg-background/80">
      <div className="mx-auto w-full max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="size-7 rounded-md bg-foreground text-background flex items-center justify-center">
            <Sparkles className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">Differentiator</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            visual + textual diff
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={show}
            className="flex items-center gap-1.5"
          >
            <Settings className="size-4" />
            Settings
          </Button>
        </nav>
      </div>
    </header>
  );
}
