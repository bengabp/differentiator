"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Play,
  RotateCw,
  AlertTriangle,
  Settings as Cog,
  Copy,
  Check,
  TimerReset,
  Target,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSettingsDialog } from "@/lib/settings-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { FileSlot } from "@/components/file-slot";
import { DiffResult } from "@/components/diff-result";
import { Skeleton } from "@/components/ui/skeleton";
import { GEMINI_MODELS } from "@/lib/settings";
import { useSettings } from "@/lib/settings-context";
import {
  DEFAULT_FIELDS,
  clearPersistedFiles,
  loadFields,
  loadPersistedFile,
  persistFile,
  saveFields,
} from "@/lib/workspace-storage";

const STAGES = [
  "Reading files…",
  "Encoding for the model…",
  "Visually comparing pages…",
  "Cross-checking text and typography…",
  "Drafting the difference report…",
];

export function CompareForm() {
  const [main, setMainState] = useState<File | null>(null);
  const [sample, setSampleState] = useState<File | null>(null);
  const [focus, setFocus] = useState("");
  const [exclude, setExclude] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [fieldsHydrated, setFieldsHydrated] = useState(false);

  const setMain = (f: File | null) => {
    setMainState(f);
    void persistFile("main", f);
  };
  const setSample = (f: File | null) => {
    setSampleState(f);
    void persistFile("sample", f);
  };

  useEffect(() => {
    const f = loadFields();
    setFocus(f.focus);
    setExclude(f.exclude);
    setInstructions(f.instructions);
    setShowNotes(f.showNotes || !!f.instructions);
    setFieldsHydrated(true);

    (async () => {
      const [persistedMain, persistedSample] = await Promise.all([
        loadPersistedFile("main"),
        loadPersistedFile("sample"),
      ]);
      if (persistedMain) setMainState(persistedMain);
      if (persistedSample) setSampleState(persistedSample);
    })();
  }, []);

  useEffect(() => {
    if (!fieldsHydrated) return;
    saveFields({ focus, exclude, instructions, showNotes });
  }, [focus, exclude, instructions, showNotes, fieldsHydrated]);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<{
    text: string;
    ms: number;
    model: string;
  } | null>(null);
  const [error, setError] = useState<{
    message: string;
    suggestion?: string;
    retryAfterSeconds?: number;
    code?: string;
  } | null>(null);
  const [errorCopied, setErrorCopied] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const retryRef = useRef<number | null>(null);
  const { show: openSettings } = useSettingsDialog();
  const { settings, hydrated, update: updateSettings } = useSettings();

  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 2500);
    return () => clearInterval(id);
  }, [loading]);

  const hasKey = hydrated && !!settings.geminiApiKey;
  const canSubmit = !!main && !!sample && hasKey && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!main || !sample) return;
    if (!hasKey) {
      toast.error("Add your Gemini API key in Settings first.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.set("apiKey", settings.geminiApiKey);
      fd.set("model", settings.geminiModel);
      fd.set("focus", focus);
      fd.set("exclude", exclude);
      fd.set("instructions", instructions);
      fd.set("main", main);
      fd.set("sample", sample);

      const res = await fetch("/api/compare", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as
        | { ok: true; text: string; ms: number; model: string }
        | {
            error: string;
            suggestion?: string;
            retryAfterSeconds?: number;
            code?: string;
          };
      if (!res.ok || "error" in data) {
        const errBody =
          "error" in data
            ? data
            : { error: "Request failed" as const };
        setError({
          message: errBody.error,
          suggestion: "suggestion" in errBody ? errBody.suggestion : undefined,
          retryAfterSeconds:
            "retryAfterSeconds" in errBody
              ? errBody.retryAfterSeconds
              : undefined,
          code: "code" in errBody ? errBody.code : undefined,
        });
        if ("retryAfterSeconds" in errBody && errBody.retryAfterSeconds) {
          setRetryCountdown(errBody.retryAfterSeconds);
        }
        toast.error(errBody.error);
        return;
      }
      setResult({ text: data.text, ms: data.ms, model: data.model });
      toast.success("Comparison complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError({ message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown <= 0) {
      setRetryCountdown(null);
      return;
    }
    retryRef.current = window.setTimeout(() => {
      setRetryCountdown((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => {
      if (retryRef.current) window.clearTimeout(retryRef.current);
    };
  }, [retryCountdown]);

  async function copyError() {
    if (!error) return;
    const parts = [
      error.message,
      error.suggestion ? `Suggestion: ${error.suggestion}` : null,
      error.code ? `Code: ${error.code}` : null,
      error.retryAfterSeconds
        ? `Retry after: ${error.retryAfterSeconds}s`
        : null,
    ].filter(Boolean) as string[];
    try {
      await navigator.clipboard.writeText(parts.join("\n"));
      setErrorCopied(true);
      toast.success("Error copied");
      setTimeout(() => setErrorCopied(false), 1400);
    } catch {
      toast.error("Could not copy");
    }
  }

  function reset() {
    setMain(null);
    setSample(null);
    setFocus("");
    setExclude("");
    setInstructions("");
    setShowNotes(false);
    setResult(null);
    setError(null);
    void clearPersistedFiles();
    saveFields(DEFAULT_FIELDS);
  }

  function resetResults() {
    setResult(null);
    setError(null);
  }

  const hasResultsPane = loading || !!result || !!error;

  const errorPane = error && !loading && (
    <Card className="border-destructive/40">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 text-sm">
          <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-destructive">
                Comparison failed
                {error.code && (
                  <span className="ml-2 text-[10px] font-mono text-destructive/70 uppercase tracking-wide">
                    {error.code}
                  </span>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyError}
              >
                {errorCopied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                Copy
              </Button>
            </div>
            <div className="text-muted-foreground mt-1 whitespace-pre-wrap break-words">
              {error.message}
            </div>
            {error.suggestion && (
              <div className="mt-2 rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-foreground/80">
                {error.suggestion}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {retryCountdown !== null && retryCountdown > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TimerReset className="size-3.5" />
                  Retry in {retryCountdown}s
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={openSettings}
              >
                <Cog className="size-4" />
                Change model
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  if (!main || !sample) return;
                  submit(e as unknown as React.FormEvent);
                }}
                disabled={
                  !main ||
                  !sample ||
                  (retryCountdown !== null && retryCountdown > 0)
                }
              >
                <Play className="size-4" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const loadingPane = loading && (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm font-medium">
            {STAGES[stage] ?? STAGES[STAGES.length - 1]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Larger documents take longer — Gemini reviews every page.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="loading-bar h-full bg-foreground/80" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );

  const resultPane = result && !loading && (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium">Difference report</h2>
          <p className="text-xs text-muted-foreground">
            Generated by {result.model}.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetResults}
          className="text-muted-foreground"
        >
          <RotateCw className="size-3.5" />
          Clear
        </Button>
      </CardHeader>
      <CardContent>
        <DiffResult
          text={result.text}
          model={result.model}
          ms={result.ms}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Find every difference between two files
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a reference file and a candidate. We&apos;ll surface visual and
          textual differences — layout, typography, copy, imagery, the works.
        </p>
      </div>

      {hydrated && !hasKey && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-amber-200">No API key set</div>
            <div className="text-amber-200/70">
              Add and test your Gemini API key in Settings before running a
              comparison.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openSettings}
          >
            <Cog className="size-4" />
            Open settings
          </Button>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 [.border-b]:pb-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-medium">Inputs</h2>
              <p className="text-xs text-muted-foreground">
                MAIN is the reference. SAMPLE is checked against MAIN.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="model" className="text-xs text-muted-foreground">
                Model
              </Label>
              <Select
                value={settings.geminiModel}
                onValueChange={(v) => v && updateSettings("geminiModel", v)}
              >
                <SelectTrigger id="model" className="h-8 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  align="end"
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
                  {!GEMINI_MODELS.some(
                    (m) => m.id === settings.geminiModel
                  ) &&
                    settings.geminiModel && (
                      <>
                        <SelectSeparator />
                        <SelectItem value={settings.geminiModel}>
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-xs truncate">
                              {settings.geminiModel}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Custom from Settings
                            </span>
                          </div>
                        </SelectItem>
                      </>
                    )}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                <Label
                  htmlFor="focus"
                  className="text-xs flex items-center gap-1.5"
                >
                  <Target className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-200">Focus on</span>
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="focus"
                  placeholder={"e.g. Pricing table on page 2.\nLogo placement.\nAny copy that mentions a date or amount."}
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  className="min-h-[88px] resize-y text-sm bg-background/40 border-emerald-500/20 focus-visible:ring-emerald-500/30"
                  disabled={loading}
                />
                <p className="text-[11px] text-emerald-200/60 leading-snug">
                  Areas / aspects the model should pay particular attention to.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3">
                <Label
                  htmlFor="exclude"
                  className="text-xs flex items-center gap-1.5"
                >
                  <Ban className="size-3.5 text-rose-400" />
                  <span className="text-rose-200">Exclude</span>
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="exclude"
                  placeholder={"e.g. Footer page numbers.\nWatermarks.\nTimestamps and dates."}
                  value={exclude}
                  onChange={(e) => setExclude(e.target.value)}
                  className="min-h-[88px] resize-y text-sm bg-background/40 border-rose-500/20 focus-visible:ring-rose-500/30"
                  disabled={loading}
                />
                <p className="text-[11px] text-rose-200/60 leading-snug">
                  Areas / aspects to ignore, even if they differ.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowNotes((s) => !s)}
                className="self-start text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                disabled={loading}
              >
                {showNotes ? "Hide" : "Add"} additional notes
              </button>
              {showNotes && (
                <Textarea
                  id="instructions"
                  placeholder="Anything else the model should know — context, prior known differences to confirm, output preferences, etc."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="min-h-[72px] resize-y text-sm"
                  disabled={loading}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {hasResultsPane ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5 flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
              <FileSlot
                label="MAIN"
                accent="main"
                file={main}
                onChange={setMain}
                compact
                disabled={loading}
              />
              <FileSlot
                label="SAMPLE"
                accent="sample"
                file={sample}
                onChange={setSample}
                compact
                disabled={loading}
              />
            </div>
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="sticky top-16 z-20 flex items-center justify-between gap-2 rounded-lg border border-border bg-background/85 backdrop-blur px-3 py-2">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Running on </span>
                    </>
                  ) : result ? (
                    <span>Last run on </span>
                  ) : (
                    <span>Model </span>
                  )}
                  <span className="font-mono text-foreground/80">
                    {settings.geminiModel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={resetResults}
                    disabled={loading}
                  >
                    <RotateCw className="size-3.5" />
                    Clear
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!canSubmit}
                    title={
                      !main || !sample
                        ? "Both MAIN and SAMPLE files are required"
                        : !hasKey
                        ? "Add an API key in Settings"
                        : retryCountdown && retryCountdown > 0
                        ? `Wait ${retryCountdown}s before retrying`
                        : undefined
                    }
                  >
                    {loading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    {loading ? "Comparing…" : "Run again"}
                  </Button>
                </div>
              </div>
              {loadingPane}
              {resultPane}
              {errorPane}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <FileSlot
              label="MAIN — reference"
              sublabel="The source of truth"
              accent="main"
              file={main}
              onChange={setMain}
            />
            <FileSlot
              label="SAMPLE — candidate"
              sublabel="Checked against MAIN"
              accent="sample"
              file={sample}
              onChange={setSample}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            disabled={loading}
          >
            <RotateCw className="size-4" />
            Reset
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {loading
              ? "Comparing…"
              : result
              ? "Run again"
              : "Run comparison"}
          </Button>
        </div>
      </form>
    </div>
  );
}
