import { NextRequest } from "next/server";
import { runCompare } from "@/lib/gemini";
import { createLogger } from "@/lib/logger";

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
  requestId?: string;
};

function normalizeError(
  err: unknown,
  model: string
): {
  status: number;
  body: Omit<ApiError, "requestId">;
} {
  const message = err instanceof Error ? err.message : String(err);

  if (/\b429\b|Too Many Requests|quota/i.test(message)) {
    const retryMatch = message.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
    const retryAfterSeconds = retryMatch
      ? Math.ceil(parseFloat(retryMatch[1]))
      : undefined;
    const isPro = /gemini-2\.5-pro|gemini-3-/i.test(model);
    return {
      status: 429,
      body: {
        error: `Gemini rate limit hit on ${model}.${
          retryAfterSeconds ? ` Try again in ~${retryAfterSeconds}s.` : ""
        }`,
        code: "rate_limited",
        retryAfterSeconds,
        suggestion: isPro
          ? "This model has a very small free-tier quota. Switch to Gemini 2.5 Flash in Settings — it's vision-capable with much higher free limits."
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
  const log = createLogger("api/compare");
  const totalStarted = Date.now();
  log.info("request received", {
    ua: req.headers.get("user-agent") ?? undefined,
    ip:
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      undefined,
  });

  let model = "unknown";
  try {
    const form = await log.step("parse multipart form", () => req.formData());

    const apiKey =
      (form.get("apiKey") as string | null) ??
      req.headers.get("x-api-key") ??
      "";
    model = (form.get("model") as string | null) ?? "gemini-2.5-flash";
    const focus = (form.get("focus") as string | null) ?? "";
    const exclude = (form.get("exclude") as string | null) ?? "";
    const instructions = (form.get("instructions") as string | null) ?? "";
    const main = form.get("main");
    const sample = form.get("sample");

    log.info("inputs parsed", {
      model,
      hasKey: !!apiKey,
      keyHint: apiKey ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}` : undefined,
      mainName: main instanceof File ? main.name : null,
      mainSize: main instanceof File ? main.size : null,
      mainType: main instanceof File ? main.type : null,
      sampleName: sample instanceof File ? sample.name : null,
      sampleSize: sample instanceof File ? sample.size : null,
      sampleType: sample instanceof File ? sample.type : null,
      focusLen: focus.length,
      excludeLen: exclude.length,
      instructionsLen: instructions.length,
    });

    if (!apiKey) {
      log.warn("missing api key");
      return Response.json(
        {
          error: "Missing API key. Open Settings to add it.",
          requestId: log.id,
        } satisfies ApiError,
        { status: 400 }
      );
    }
    if (!(main instanceof File) || !(sample instanceof File)) {
      log.warn("missing files");
      return Response.json(
        {
          error: "Both 'main' and 'sample' files are required.",
          requestId: log.id,
        } satisfies ApiError,
        { status: 400 }
      );
    }

    const MAX = 20 * 1024 * 1024;
    if (main.size > MAX || sample.size > MAX) {
      log.warn("file too large", { mainSize: main.size, sampleSize: sample.size });
      return Response.json(
        {
          error: "Files must be 20 MB or less each.",
          requestId: log.id,
        } satisfies ApiError,
        { status: 413 }
      );
    }

    const [mainInline, sampleInline] = await log.step(
      "encode files to base64",
      () => Promise.all([fileToInline(main), fileToInline(sample)])
    );
    log.info("files encoded", {
      mainB64Len: mainInline.data.length,
      sampleB64Len: sampleInline.data.length,
    });

    const text = await log.step(`Gemini generateContent (${model})`, () =>
      runCompare({
        apiKey,
        model,
        main: mainInline,
        sample: sampleInline,
        focus,
        exclude,
        extraInstructions: instructions,
        logger: log.child("gemini"),
      })
    );

    const ms = Date.now() - totalStarted;
    log.info("comparison complete", { ms, chars: text.length, model });
    return Response.json({
      ok: true,
      text,
      ms,
      model,
      requestId: log.id,
    });
  } catch (err) {
    const { status, body } = normalizeError(err, model);
    log.error("compare failed", {
      status,
      code: body.code,
      retryAfterSeconds: body.retryAfterSeconds,
      err: err instanceof Error ? err.message : String(err),
      ms: Date.now() - totalStarted,
    });
    return Response.json({ ...body, requestId: log.id }, { status });
  }
}
