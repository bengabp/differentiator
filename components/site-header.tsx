"use client";

import Link from "next/link";
import { Sparkles, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsDialog } from "@/lib/settings-dialog";

export function SiteHeader() {
  const { show } = useSettingsDialog();
  return (
    <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-40 bg-background/80">
      <div className="mx-auto w-full max-w-7xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="size-7 rounded-md bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-400 text-white shadow-sm shadow-fuchsia-500/30 flex items-center justify-center">
            <Sparkles className="size-4" />
          </span>
          <span className="font-semibold tracking-tight bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
            Differentiator
          </span>
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
