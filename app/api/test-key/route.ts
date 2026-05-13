import { NextRequest } from "next/server";
import { listModels } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = (await req.json()) as { apiKey?: string };
    if (!apiKey) {
      return Response.json({ error: "API key is empty." }, { status: 400 });
    }
    const models = await listModels(apiKey);
    return Response.json({
      ok: true,
      modelCount: models.length,
      models: models
        .map((m) => m.name.replace(/^models\//, ""))
        .filter((n) => n.startsWith("gemini")),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
