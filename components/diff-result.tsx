"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  layout: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  typography: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  color: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  text: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  image: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  table: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  chart: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  icon: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  logo: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  spacing: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  alignment: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  page: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  metadata: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  other: "bg-stone-500/15 text-stone-300 border-stone-500/30",
};

function categoryClasses(c?: string) {
  if (!c) return "bg-secondary text-secondary-foreground border-border";
  return (
    CATEGORY_COLORS[c.toLowerCase().trim()] ||
    "bg-secondary text-secondary-foreground border-border"
  );
}

type SimilarityTier = {
  label: string;
  text: string;
  track: string;
  bar: string;
  ring: string;
};

function similarityTier(score: number): SimilarityTier {
  if (score >= 95) {
    return {
      label: "Near-identical",
      text: "text-emerald-300",
      track: "bg-emerald-500/15",
      bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
      ring: "ring-emerald-500/30",
    };
  }
  if (score >= 80) {
    return {
      label: "Minor differences",
      text: "text-lime-300",
      track: "bg-lime-500/15",
      bar: "bg-gradient-to-r from-lime-500 to-emerald-400",
      ring: "ring-lime-500/30",
    };
  }
  if (score >= 60) {
    return {
      label: "Moderate differences",
      text: "text-amber-300",
      track: "bg-amber-500/15",
      bar: "bg-gradient-to-r from-amber-500 to-lime-400",
      ring: "ring-amber-500/30",
    };
  }
  if (score >= 30) {
    return {
      label: "Substantial differences",
      text: "text-orange-300",
      track: "bg-orange-500/15",
      bar: "bg-gradient-to-r from-orange-500 to-amber-400",
      ring: "ring-orange-500/30",
    };
  }
  return {
    label: "Very different",
    text: "text-rose-300",
    track: "bg-rose-500/15",
    bar: "bg-gradient-to-r from-rose-500 to-orange-400",
    ring: "ring-rose-500/30",
  };
}

function parseSimilarity(text: string): { score: number; rationale?: string } | null {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^#{1,6}\s*similarity\b/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,6}\s/.test(line)) break;
    if (!inSection || !line) continue;
    const m = line.match(/`?\s*(\d{1,3})\s*%\s*(?:[—\-–:|]\s*(.+?))?\s*`?$/);
    if (m) {
      const score = Math.min(100, Math.max(0, parseInt(m[1], 10)));
      return { score, rationale: m[2]?.trim() };
    }
  }
  return null;
}
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DiffResultProps = {
  text: string;
  model?: string;
  ms?: number;
};

export function DiffResult({ text, model, ms }: DiffResultProps) {
  const [copiedAll, setCopiedAll] = useState(false);

  const items = useMemo(() => parseDifferences(text), [text]);
  const similarity = useMemo(() => parseSimilarity(text), [text]);

  async function copyText(t: string) {
    try {
      await navigator.clipboard.writeText(t);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function copyAll() {
    await copyText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1400);
  }

  function downloadMd() {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `differentiator-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {similarity && (
        <SimilarityGauge
          score={similarity.score}
          rationale={similarity.rationale}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {items.length} {items.length === 1 ? "difference" : "differences"}
          </Badge>
          {model && (
            <Badge variant="outline" className="text-xs font-mono">
              {model}
            </Badge>
          )}
          {typeof ms === "number" && (
            <Badge variant="outline" className="text-xs font-mono">
              {(ms / 1000).toFixed(1)}s
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadMd}>
            <Download className="size-4" />
            Download .md
          </Button>
          <Button variant="default" size="sm" onClick={copyAll}>
            {copiedAll ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            Copy all
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="rendered">Rendered</TabsTrigger>
          <TabsTrigger value="raw">Raw markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-3">
          {items.length === 0 ? (
            <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
              The model did not return a parsable difference list. Switch to
              &quot;Rendered&quot; or &quot;Raw markdown&quot; to inspect the response.
            </div>
          ) : (
            <ScrollArea className="h-[520px] rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {items.map((it, i) => (
                  <li
                    key={i}
                    className="group flex items-start gap-3 px-4 py-3 hover:bg-card/60"
                  >
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-secondary text-xs text-secondary-foreground font-mono">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {it.category && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] border",
                              categoryClasses(it.category)
                            )}
                          >
                            {it.category}
                          </Badge>
                        )}
                        {it.location && (
                          <span className="text-muted-foreground">
                            {it.location}
                          </span>
                        )}
                        {it.impact && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              it.impact === "high"
                                ? "border-rose-500/60 text-rose-300 bg-rose-500/10"
                                : it.impact === "medium"
                                ? "border-amber-500/60 text-amber-300 bg-amber-500/10"
                                : "border-emerald-500/60 text-emerald-300 bg-emerald-500/10"
                            )}
                          >
                            {it.impact}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                        {it.body}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 opacity-0 group-hover:opacity-100"
                      onClick={() => copyText(it.raw)}
                      aria-label="Copy difference"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="rendered" className="mt-3">
          <ScrollArea className="h-[520px] rounded-lg border border-border p-5">
            <div className="prose prose-sm prose-invert max-w-none prose-headings:tracking-tight">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="raw" className="mt-3">
          <ScrollArea className="h-[520px] rounded-lg border border-border">
            <pre className="text-xs font-mono p-4 whitespace-pre-wrap break-words">
              {text}
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SimilarityGauge({
  score,
  rationale,
}: {
  score: number;
  rationale?: string;
}) {
  const tier = similarityTier(score);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/40 p-4 ring-1",
        tier.ring
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-3xl font-semibold tracking-tight tabular-nums",
              tier.text
            )}
          >
            {score}%
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            similarity
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-1 rounded-md border",
            tier.text,
            tier.track
          )}
        >
          {tier.label}
        </span>
      </div>
      <div
        className={cn(
          "mt-3 h-2 w-full overflow-hidden rounded-full",
          tier.track
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", tier.bar)}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
      {rationale && (
        <p className="mt-2 text-xs text-muted-foreground leading-snug">
          {rationale}
        </p>
      )}
    </div>
  );
}

type ParsedDiff = {
  raw: string;
  body: string;
  category?: string;
  location?: string;
  impact?: "low" | "medium" | "high";
};

function parseDifferences(text: string): ParsedDiff[] {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  const items: ParsedDiff[] = [];
  for (const line of lines) {
    if (/^#{1,6}\s*differences\b/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,6}\s/.test(line)) {
      inSection = false;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*\d+\.\s+(.*)$/);
    if (!m) continue;
    const raw = m[1].trim();

    const catMatch = raw.match(/\*\*\[?([^\]*]+?)\]?\*\*/);
    const locMatch = raw.match(/\*\(([^)]+)\)\*/);
    const impactMatch = raw.match(/impact\s*:\s*(low|medium|high)/i);

    let body = raw
      .replace(/\*\*\[?[^\]*]+\]?\*\*/, "")
      .replace(/\*\([^)]+\)\*/, "")
      .replace(/^\s*[—-]\s*/, "")
      .trim();
    if (impactMatch) {
      body = body.replace(/impact\s*:\s*(low|medium|high)\.?/i, "").trim();
    }

    items.push({
      raw,
      body,
      category: catMatch?.[1]?.trim(),
      location: locMatch?.[1]?.trim(),
      impact: impactMatch?.[1]?.toLowerCase() as ParsedDiff["impact"],
    });
  }
  return items;
}
