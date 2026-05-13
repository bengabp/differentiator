"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  show: () => void;
};

const SettingsDialogContext = createContext<Ctx | null>(null);

export function SettingsDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  return (
    <SettingsDialogContext.Provider value={{ open, setOpen, show }}>
      {children}
    </SettingsDialogContext.Provider>
  );
}

export function useSettingsDialog() {
  const ctx = useContext(SettingsDialogContext);
  if (!ctx)
    throw new Error(
      "useSettingsDialog must be used inside <SettingsDialogProvider>"
    );
  return ctx;
}
