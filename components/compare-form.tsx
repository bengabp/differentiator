"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Play, RotateCw, AlertTriangle, Settings as Cog } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { DiffResult } from "@/components/diff-result";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [error, setError] = useState<string | null>(null);

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
        | { error: string };
      if (!res.ok || "error" in data) {
        const msg = "error" in data ? data.error : "Request failed";
        setError(msg);
        toast.error(msg);
        return;
      }
      setResult({ text: data.text, ms: data.ms, model: data.model });
      toast.success("Comparison complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMain(null);
    setSample(null);
    setInstructions("");
    setResult(null);
    setError(null);
  }

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

      {hydrated && !hasKey && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-amber-200">No API key set</div>
            <div className="text-amber-200/70">
              Add and test your Gemini API key in{" "}
              <Link
                href="/settings"
                className="underline underline-offset-2 hover:text-amber-100"
              >
                Settings
              </Link>{" "}
              before running a comparison.
            </div>
          </div>
          <Link
            href="/settings"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "flex items-center gap-1.5"
            )}
          >
            <Cog className="size-4" />
            Open settings
          </Link>
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
                <SelectContent>
                  {GEMINI_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col">
                        <span>{m.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {m.hint}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
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

      {error && !loading && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-sm">
              <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-destructive">
                  Comparison failed
                </div>
                <div className="text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                  {error}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-medium">Difference report</h2>
            <p className="text-xs text-muted-foreground">
              Generated by {result.model}. Click any item to highlight, hover to
              copy.
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
    </div>
  );
}
