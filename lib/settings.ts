"use client";

export const SETTINGS_KEY = "differentiator.settings.v1";

export type ProviderId = "gemini";

export type Settings = {
  provider: ProviderId;
  geminiApiKey: string;
  geminiModel: string;
};

export const DEFAULT_SETTINGS: Settings = {
  provider: "gemini",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
};

export const GEMINI_MODELS = [
  {
    id: "gemini-3-pro-preview",
    label: "Gemini 3 Pro (preview)",
    hint: "Newest · strongest vision + reasoning · paid plan recommended",
    tier: "frontier" as const,
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash (preview)",
    hint: "Newest fast model · paid plan recommended",
    tier: "frontier" as const,
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    hint: "Recommended default · vision + generous free tier",
    tier: "stable" as const,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    hint: "Strong reasoning · very small free-tier quota",
    tier: "stable" as const,
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    hint: "Fastest · cheapest",
    tier: "stable" as const,
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    hint: "Legacy fast model",
    tier: "legacy" as const,
  },
];

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
