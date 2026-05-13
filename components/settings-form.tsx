"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_SETTINGS,
  GEMINI_MODELS,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/settings";

type TestState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; modelCount: number; models: string[] }
  | { kind: "err"; message: string };

export type SettingsFormProps = {
  onSaved?: () => void;
};

export function SettingsForm({ onSaved }: SettingsFormProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
    setTest({ kind: "idle" });
  }

  function persist() {
    saveSettings(settings);
    setDirty(false);
    toast.success("Settings saved");
    onSaved?.();
  }

  function clearAll() {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setDirty(false);
    setTest({ kind: "idle" });
    toast.success("Settings cleared");
  }

  async function testKey() {
    if (!settings.geminiApiKey) {
      toast.error("Enter an API key first.");
      return;
    }
    setTest({ kind: "loading" });
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: settings.geminiApiKey }),
      });
      const data = (await res.json()) as
        | { ok: true; modelCount: number; models: string[] }
        | { error: string };
      if (!res.ok || "error" in data) {
        const msg = "error" in data ? data.error : "Failed";
        setTest({ kind: "err", message: msg });
        toast.error("API key check failed");
        return;
      }
      setTest({
        kind: "ok",
        modelCount: data.modelCount,
        models: data.models,
      });
      toast.success(`Key works — ${data.modelCount} models available`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setTest({ kind: "err", message: msg });
      toast.error(msg);
    }
  }

  const maskedHint = useMemo(() => {
    if (!settings.geminiApiKey) return "";
    const k = settings.geminiApiKey;
    if (k.length < 8) return "•".repeat(k.length);
    return `${k.slice(0, 4)}••••${k.slice(-4)}`;
  }, [settings.geminiApiKey]);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-md bg-secondary flex items-center justify-center">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-medium">Provider</h2>
              <p className="text-xs text-muted-foreground">
                Pick the model used for comparisons.
              </p>
            </div>
          </div>
          <Badge variant="secondary">Google Gemini</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="model" className="text-xs">
              Model preset
            </Label>
            <Select
              value={
                GEMINI_MODELS.some((m) => m.id === settings.geminiModel)
                  ? settings.geminiModel
                  : "__custom__"
              }
              onValueChange={(v) => {
                if (!v) return;
                if (v === "__custom__") return;
                update("geminiModel", v);
              }}
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                className="min-w-[340px] max-w-[440px]"
              >
                <SelectGroup>
                  <SelectLabel>Gemini · multimodal</SelectLabel>
                  {GEMINI_MODELS.filter((m) => m.family === "gemini").map(
                    (m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{m.label}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-normal leading-snug">
                            {m.hint}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Gemma · open weights</SelectLabel>
                  {GEMINI_MODELS.filter((m) => m.family === "gemma").map(
                    (m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{m.label}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-normal leading-snug">
                            {m.hint}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
                <SelectSeparator />
                <SelectItem value="__custom__">
                  <div className="flex flex-col">
                    <span>Custom…</span>
                    <span className="text-[10px] text-muted-foreground">
                      Paste any model ID (Gemini, Gemma, etc.) below
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="model-custom" className="text-xs">
              Model ID
            </Label>
            <Input
              id="model-custom"
              placeholder="gemini-3-pro-preview"
              value={settings.geminiModel}
              onChange={(e) => update("geminiModel", e.target.value.trim())}
              className="font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Use Test below to list every model your key can call. Paste an
              ID here to override the preset.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-md bg-secondary flex items-center justify-center">
              <KeyRound className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-medium">Gemini API key</h2>
              <p className="text-xs text-muted-foreground">
                Get one from{" "}
                <a
                  className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google AI Studio
                  <ExternalLink className="size-3" />
                </a>
              </p>
            </div>
          </div>
          {hydrated && settings.geminiApiKey && (
            <span className="text-xs font-mono text-muted-foreground">
              {maskedHint}
            </span>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="key"
                placeholder="AIza…"
                value={settings.geminiApiKey}
                onChange={(e) => update("geminiApiKey", e.target.value.trim())}
                type={show ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide key" : "Show key"}
              >
                {show ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={testKey}
              disabled={test.kind === "loading" || !settings.geminiApiKey}
            >
              {test.kind === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : test.kind === "ok" ? (
                <CheckCircle2 className="size-4 text-emerald-400" />
              ) : (
                <Check className="size-4" />
              )}
              {test.kind === "loading" ? "Testing…" : "Test"}
            </Button>
          </div>

          {test.kind === "ok" && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              <div className="font-medium text-emerald-300">
                Connected. {test.modelCount} models available.
              </div>
              {test.models.length > 0 && (
                <div className="mt-1 text-emerald-200/70 font-mono break-words">
                  {test.models.slice(0, 8).join(", ")}
                  {test.models.length > 8 ? "…" : ""}
                </div>
              )}
            </div>
          )}

          {test.kind === "err" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-destructive">
                <ShieldAlert className="size-3.5" /> Test failed
              </div>
              <div className="mt-1 text-destructive/80 whitespace-pre-wrap break-words">
                {test.message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          Clear all
        </Button>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-muted-foreground">
              Unsaved changes
            </span>
          )}
          <Button onClick={persist} disabled={!dirty}>
            <Check className="size-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
