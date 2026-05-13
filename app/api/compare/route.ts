import { NextRequest } from "next/server";
import { runCompare } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

async function fileToInline(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return { mimeType: file.type, data: buf.toString("base64") };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const apiKey =
      (form.get("apiKey") as string | null) ??
      req.headers.get("x-api-key") ??
      "";
    const model = (form.get("model") as string | null) ?? "gemini-2.5-pro";
    const instructions = (form.get("instructions") as string | null) ?? "";
    const main = form.get("main");
    const sample = form.get("sample");

    if (!apiKey) {
      return Response.json(
        { error: "Missing API key. Open Settings to add it." },
        { status: 400 }
      );
    }
    if (!(main instanceof File) || !(sample instanceof File)) {
      return Response.json(
        { error: "Both 'main' and 'sample' files are required." },
        { status: 400 }
      );
    }

    const MAX = 20 * 1024 * 1024;
    if (main.size > MAX || sample.size > MAX) {
      return Response.json(
        { error: "Files must be 20 MB or less each." },
        { status: 413 }
      );
    }

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
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
