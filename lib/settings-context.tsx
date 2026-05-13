"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  SETTINGS_KEY,
  type Settings,
} from "@/lib/settings";

type Ctx = {
  settings: Settings;
  hydrated: boolean;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  replace: (next: Settings) => void;
  reset: () => void;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);

    function onStorage(e: StorageEvent) {
      if (e.key !== SETTINGS_KEY) return;
      setSettings(loadSettings());
    }
    function onCustom() {
      setSettings(loadSettings());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("differentiator:settings-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("differentiator:settings-changed", onCustom);
    };
  }, []);

  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((s) => {
        const next = { ...s, [key]: value };
        saveSettings(next);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("differentiator:settings-changed"));
        }
        return next;
      });
    },
    []
  );

  const replace = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("differentiator:settings-changed"));
    }
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("differentiator:settings-changed"));
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, hydrated, update, replace, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
