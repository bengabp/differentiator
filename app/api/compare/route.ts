import { NextRequest } from "next/server";
import { runCompare } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

async function fileToInline(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return { mimeType: file.type, data: buf.toString("base64") };
}

type ApiError = {
  error: string;
  code?: string;
  retryAfterSeconds?: number;
  suggestion?: string;
};

function normalizeError(err: unknown, model: string): {
  status: number;
  body: ApiError;
} {
  const message = err instanceof Error ? err.message : String(err);

  if (/\b429\b|Too Many Requests|quota/i.test(message)) {
    const retryMatch = message.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
    const retryAfterSeconds = retryMatch
      ? Math.ceil(parseFloat(retryMatch[1]))
      : undefined;
    const isPro = /gemini-2\.5-pro/i.test(model);
    return {
      status: 429,
      body: {
        error: `Gemini rate limit hit on ${model}.${
          retryAfterSeconds ? ` Try again in ~${retryAfterSeconds}s.` : ""
        }`,
        code: "rate_limited",
        retryAfterSeconds,
        suggestion: isPro
          ? "Gemini 2.5 Pro has a very small free-tier quota. Switch to Gemini 2.5 Flash in Settings (or on this page) — it's vision-capable with much higher free limits."
          : "Wait for the cooldown, switch to another model, or enable billing on your Google AI Studio project.",
      },
    };
  }

  if (/\b401\b|API key not valid|unauthorized/i.test(message)) {
    return {
      status: 401,
      body: {
        error: "Gemini rejected the API key.",
        code: "invalid_key",
        suggestion: "Re-check the key in Settings and run Test.",
      },
    };
  }

  if (/\b403\b|permission/i.test(message)) {
    return {
      status: 403,
      body: {
        error: `Permission denied for ${model}.`,
        code: "forbidden",
        suggestion:
          "Your key may not have access to this model. Try Gemini 2.5 Flash.",
      },
    };
  }

  if (/\b400\b|inline.*data|size|too large/i.test(message)) {
    return {
      status: 400,
      body: {
        error: "Gemini couldn't read one of the files.",
        code: "bad_input",
        suggestion:
          "Files must be valid PDF or PNG/JPEG/WEBP and under 20 MB each.",
      },
    };
  }

  return { status: 500, body: { error: message } };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const apiKey =
    (form.get("apiKey") as string | null) ??
    req.headers.get("x-api-key") ??
    "";
  const model = (form.get("model") as string | null) ?? "gemini-2.5-flash";
  const instructions = (form.get("instructions") as string | null) ?? "";
  const main = form.get("main");
  const sample = form.get("sample");

  if (!apiKey) {
    return Response.json(
      { error: "Missing API key. Open Settings to add it." } satisfies ApiError,
      { status: 400 }
    );
  }
  if (!(main instanceof File) || !(sample instanceof File)) {
    return Response.json(
      {
        error: "Both 'main' and 'sample' files are required.",
      } satisfies ApiError,
      { status: 400 }
    );
  }

  const MAX = 20 * 1024 * 1024;
  if (main.size > MAX || sample.size > MAX) {
    return Response.json(
      { error: "Files must be 20 MB or less each." } satisfies ApiError,
      { status: 413 }
    );
  }

  try {
    const [mainInline, sampleInline] = await Promise.all([
      fileToInline(main),
      fileToInline(sample),
    ]);

    const started = Date.now();
    const text = await runCompare({
      apiKey,
      model,
      main: mainInline,
      sample: sampleInline,
      extraInstructions: instructions,
    });
    return Response.json({
      ok: true,
      text,
      ms: Date.now() - started,
      model,
    });
  } catch (err) {
    const { status, body } = normalizeError(err, model);
    return Response.json(body, { status });
  }
}
