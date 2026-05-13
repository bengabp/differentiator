"use client";

import { Settings as Cog } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsForm } from "@/components/settings-form";
import { useSettingsDialog } from "@/lib/settings-dialog";

export function SettingsDialog() {
  const { open, setOpen } = useSettingsDialog();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="size-7 rounded-md bg-secondary flex items-center justify-center">
              <Cog className="size-4" />
            </span>
            Settings
          </DialogTitle>
          <DialogDescription>
            Your API key is stored only in this browser and never logged.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <SettingsForm onSaved={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
