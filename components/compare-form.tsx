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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDrop } from "@/components/file-drop";
import { FilePreview } from "@/components/file-preview";
import { DiffResult } from "@/components/diff-result";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Columns2, Files, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_SETTINGS,
  GEMINI_MODELS,
  loadSettings,
  saveSettings,
} from "@/lib/settings";

const STAGES = [
  "Reading files…",
  "Encoding for the model…",
  "Visually comparing pages…",
  "Cross-checking text and typography…",
  "Drafting the difference report…",
];

export function CompareForm() {
  const [main, setMain] = useState<File | null>(null);
  const [sample, setSample] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
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
  const [view, setView] = useState<"compare" | "split" | "results">("compare");

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setHydrated(true);
  }, []);

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
    setView("results");

    try {
      const fd = new FormData();
      fd.set("apiKey", settings.geminiApiKey);
      fd.set("model", settings.geminiModel);
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
      setView("results");
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
    setInstructions("");
    setResult(null);
    setError(null);
    setView("compare");
  }

  const bothFiles = !!main && !!sample;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Find every difference between two files
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a reference file and a candidate. We&apos;ll surface visual and
          textual differences — layout, typography, copy, imagery, the works.
        </p>
      </div>

      <Tabs value={view} onValueChange={(v) => v && setView(v as typeof view)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="compare">
              <Files className="size-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="split" disabled={!bothFiles}>
              <Columns2 className="size-4" />
              Split
              {bothFiles && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                  preview
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!result && !loading}>
              <FileSearch className="size-4" />
              Results
              {result && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                  ready
                </Badge>
              )}
              {loading && (
                <Loader2 className="size-3 animate-spin text-muted-foreground" />
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {main && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {main.name}
              </span>
            )}
            {sample && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" />
                {sample.name}
              </span>
            )}
          </div>
        </div>

        <TabsContent value="compare" className="flex flex-col gap-6 mt-4">
          {hydrated && !hasKey && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
              <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-amber-200">
                  No API key set
                </div>
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
                onValueChange={(v) => {
                  if (!v) return;
                  const next = { ...settings, geminiModel: v };
                  setSettings(next);
                  saveSettings(next);
                }}
              >
                <SelectTrigger id="model" className="h-8 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  align="end"
                  className="min-w-[320px] max-w-[420px]"
                >
                  {GEMINI_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{m.label}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-normal leading-snug">
                          {m.hint}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {!GEMINI_MODELS.some(
                    (m) => m.id === settings.geminiModel
                  ) &&
                    settings.geminiModel && (
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
                    )}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FileDrop
              label="MAIN — reference"
              sublabel="The source of truth"
              value={main}
              onChange={setMain}
              accent="main"
            />
            <FileDrop
              label="SAMPLE — candidate"
              sublabel="Checked against MAIN"
              value={sample}
              onChange={setSample}
              accent="sample"
            />
            <div className="md:col-span-2 flex flex-col gap-2">
              <Label htmlFor="instructions" className="text-xs">
                Extra instructions{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="instructions"
                placeholder="e.g. Focus on pricing tables. Ignore footer page numbers."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[72px] resize-y"
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

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
            {loading ? "Comparing…" : "Run comparison"}
          </Button>
        </div>
      </form>

          {error && !loading && (
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
          )}
        </TabsContent>

        <TabsContent value="split" className="mt-4">
          {bothFiles ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FilePreview label="MAIN" accent="main" file={main} />
              <FilePreview label="SAMPLE" accent="sample" file={sample} />
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
                <Columns2 className="size-8 text-muted-foreground" />
                <div className="text-sm font-medium">
                  Upload both files to enable Split view
                </div>
                <div className="text-xs text-muted-foreground max-w-sm">
                  Pick a MAIN reference and a SAMPLE candidate in the Compare
                  tab, then come back here to see them side-by-side.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setView("compare")}
                >
                  <Files className="size-4" />
                  Go to Compare
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          {loading && (
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
          )}

          {result && !loading && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-medium">Difference report</h2>
                <p className="text-xs text-muted-foreground">
                  Generated by {result.model}. Click any item to highlight,
                  hover to copy.
                </p>
              </CardHeader>
              <CardContent>
                <DiffResult
                  text={result.text}
                  model={result.model}
                  ms={result.ms}
                />
              </CardContent>
            </Card>
          )}

          {!result && !loading && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
                <FileSearch className="size-8 text-muted-foreground" />
                <div className="text-sm font-medium">No results yet</div>
                <div className="text-xs text-muted-foreground max-w-sm">
                  Run a comparison from the Compare tab to populate this view.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
