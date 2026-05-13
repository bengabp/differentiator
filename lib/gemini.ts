import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

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
  extraInstructions?: string;
}) {
  assertAllowed(opts.main.mimeType);
  assertAllowed(opts.sample.mimeType);
  const client = getClient(opts.apiKey);
  const model = client.getGenerativeModel({
    model: opts.model,
    systemInstruction: COMPARE_SYSTEM,
  });

  const parts: Part[] = [
    { text: "FILE 1 — MAIN (reference):" },
    { inlineData: { mimeType: opts.main.mimeType, data: opts.main.data } },
    { text: "FILE 2 — SAMPLE (candidate):" },
    { inlineData: { mimeType: opts.sample.mimeType, data: opts.sample.data } },
    {
      text:
        opts.extraInstructions?.trim()
          ? `Additional reviewer instructions:\n${opts.extraInstructions.trim()}`
          : "Now produce the diff report following the required format.",
    },
  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });
  return result.response.text();
}
