import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import type { Logger } from "@/lib/logger";

export type InlineFile = {
  mimeType: string;
  data: string; // base64
};

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function assertAllowed(mime: string) {
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(
      `Unsupported file type "${mime}". Use PDF, PNG, JPEG, WEBP, HEIC, or HEIF.`
    );
  }
}

export function getClient(apiKey: string) {
  if (!apiKey) throw new Error("Missing Gemini API key.");
  return new GoogleGenerativeAI(apiKey);
}

export async function listModels(apiKey: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
      apiKey
    )}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `API key check failed (${res.status}): ${text.slice(0, 240)}`
    );
  }
  const data = (await res.json()) as {
    models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
  };
  return (
    data.models?.filter((m) =>
      m.supportedGenerationMethods?.includes("generateContent")
    ) ?? []
  );
}

const COMPARE_SYSTEM = `You are a meticulous visual + textual diff engine.

You are given TWO files, in order:
  1. MAIN — the reference / source of truth.
  2. SAMPLE — the candidate being checked against MAIN.

Compare them exhaustively. Report EVERY difference, even tiny ones. Cover:

- Visual: layout, spacing, alignment, sizing, colors, shadows, borders, line weights,
  iconography, photography, logos/marks, image content, charts, tables, watermarks,
  page count, page order, orientation, margins, cropping.
- Typographic: font family, weight, size, line-height, tracking, case, italics,
  decoration, hierarchy.
- Textual: word-for-word wording, punctuation, numbers, dates, currencies, units,
  spelling, capitalization, missing or extra sentences, paragraph breaks.
- Structural: sections, headings, lists, ordering, navigation, footers/headers,
  pagination, signatures, stamps, QR/barcodes.
- Metadata visible in the file (if any): visible filenames, dates, version labels.

Output STRICT MARKDOWN with this exact shape:

## Similarity
One line, this exact format:
\`NN% — <one-sentence rationale>\`
Where NN is an integer from 0 to 100. 100 means visually and textually identical; 0 means nothing in common. Calibration:
- 95–100: identical or near-identical (only rendering noise / anti-aliasing differences)
- 80–94: minor differences (small text edits, slight color shifts, minor spacing)
- 60–79: moderate differences (multiple text changes, swapped images, layout tweaks)
- 30–59: substantial differences (major content/layout changes, but recognizably the same document)
- 1–29: very different (mostly unrelated)
- 0: completely different / unrelated documents
Pick a single specific integer, not a range. If an EXCLUDE directive removes most differences, score as if those differences didn't exist.

## Summary
One short paragraph (max 3 sentences) describing how different the SAMPLE is from the MAIN.

## Verdict
One line: "Identical", "Near-identical with minor differences", "Materially different", or "Completely different".

## Differences
A numbered list. Each item MUST follow this template on a single line:

\`N. **[Category]** *(Location)* — MAIN: <what main shows>. SAMPLE: <what sample shows>. Impact: <low|medium|high>.\`

Category is one of: Layout, Typography, Color, Text, Image, Table, Chart, Icon, Logo, Spacing, Alignment, Page, Metadata, Other.
Location is concrete (e.g. "Page 1, top-left header", "Hero image", "Footer row 2").
If there are no differences, write "No differences detected." and stop.

## Notes
Optional. Anything you could not determine confidently (e.g. blurry region, can't read small text).

Be exhaustive but concise. Do not invent details. If a region is unreadable, say so in Notes.`;

export async function runCompare(opts: {
  apiKey: string;
  model: string;
  main: InlineFile;
  sample: InlineFile;
  focus?: string;
  exclude?: string;
  extraInstructions?: string;
  logger?: Logger;
}) {
  const log = opts.logger;
  assertAllowed(opts.main.mimeType);
  assertAllowed(opts.sample.mimeType);

  log?.debug("building client", { model: opts.model });
  const client = getClient(opts.apiKey);
  const model = client.getGenerativeModel({
    model: opts.model,
    systemInstruction: COMPARE_SYSTEM,
  });

  const directives: string[] = [];
  const focus = opts.focus?.trim();
  const exclude = opts.exclude?.trim();
  const extra = opts.extraInstructions?.trim();
  if (focus) {
    directives.push(
      `FOCUS — pay particular attention to these areas / aspects:\n${focus}`
    );
  }
  if (exclude) {
    directives.push(
      `EXCLUDE — do NOT report differences in these areas / aspects, even if they exist:\n${exclude}`
    );
  }
  if (extra) {
    directives.push(`OTHER NOTES from the reviewer:\n${extra}`);
  }
  const directiveText = directives.length
    ? `Reviewer directives (apply these strictly):\n\n${directives.join(
        "\n\n"
      )}\n\nNow produce the diff report following the required format. If the EXCLUDE directive removes most differences, say so in the Summary.`
    : "Now produce the diff report following the required format.";

  const parts: Part[] = [
    { text: "FILE 1 — MAIN (reference):" },
    { inlineData: { mimeType: opts.main.mimeType, data: opts.main.data } },
    { text: "FILE 2 — SAMPLE (candidate):" },
    { inlineData: { mimeType: opts.sample.mimeType, data: opts.sample.data } },
    { text: directiveText },
  ];

  log?.info("sending to gemini", {
    model: opts.model,
    parts: parts.length,
    mainMime: opts.main.mimeType,
    sampleMime: opts.sample.mimeType,
    mainBytes: Math.round((opts.main.data.length * 3) / 4),
    sampleBytes: Math.round((opts.sample.data.length * 3) / 4),
    focusLen: focus?.length ?? 0,
    excludeLen: exclude?.length ?? 0,
    extraLen: extra?.length ?? 0,
  });

  const started = Date.now();
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    });
    const text = result.response.text();
    const usage = result.response.usageMetadata;
    log?.info("gemini response received", {
      ms: Date.now() - started,
      chars: text.length,
      finishReason: result.response.candidates?.[0]?.finishReason,
      promptTokens: usage?.promptTokenCount,
      candidateTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
    });
    return text;
  } catch (err) {
    log?.error("gemini call failed", {
      ms: Date.now() - started,
      model: opts.model,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
