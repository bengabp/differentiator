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

export type ModelFamily = "gemini" | "gemma";

export type ModelPreset = {
  id: string;
  label: string;
  hint: string;
  family: ModelFamily;
  tier: "frontier" | "stable" | "legacy" | "open";
};

export const GEMINI_MODELS: ModelPreset[] = [
  {
    id: "gemini-3-pro-preview",
    label: "Gemini 3 Pro (preview)",
    hint: "Newest · strongest vision + reasoning · paid plan recommended",
    family: "gemini",
    tier: "frontier",
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash (preview)",
    hint: "Newest fast model · paid plan recommended",
    family: "gemini",
    tier: "frontier",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    hint: "Recommended default · vision + generous free tier",
    family: "gemini",
    tier: "stable",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    hint: "Strong reasoning · very small free-tier quota",
    family: "gemini",
    tier: "stable",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    hint: "Fastest · cheapest",
    family: "gemini",
    tier: "stable",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    hint: "Legacy fast model",
    family: "gemini",
    tier: "legacy",
  },
  {
    id: "gemma-4-27b-it",
    label: "Gemma 4 · 27B IT",
    hint: "Open-weight, biggest Gemma 4 · best quality · paid",
    family: "gemma",
    tier: "open",
  },
  {
    id: "gemma-4-12b-it",
    label: "Gemma 4 · 12B IT",
    hint: "Open-weight · solid vision · balanced speed",
    family: "gemma",
    tier: "open",
  },
  {
    id: "gemma-4-4b-it",
    label: "Gemma 4 · 4B IT",
    hint: "Open-weight · cheap and fast · vision-capable",
    family: "gemma",
    tier: "open",
  },
  {
    id: "gemma-4-1b-it",
    label: "Gemma 4 · 1B IT",
    hint: "Open-weight · smallest · text only — won't see images",
    family: "gemma",
    tier: "open",
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
