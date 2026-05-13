"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy, Download } from "lucide-react";
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
                          <Badge variant="secondary" className="text-[10px]">
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
                            className={
                              "text-[10px] " +
                              (it.impact === "high"
                                ? "border-red-500/60 text-red-300"
                                : it.impact === "medium"
                                ? "border-amber-500/60 text-amber-300"
                                : "border-emerald-500/60 text-emerald-300")
                            }
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
