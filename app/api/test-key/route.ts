import { NextRequest } from "next/server";
import { listModels } from "@/lib/gemini";
import { createLogger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const log = createLogger("api/test-key");
  log.info("request received");

  try {
    const { apiKey } = (await req.json()) as { apiKey?: string };
    if (!apiKey) {
      log.warn("empty api key");
      return Response.json(
        { error: "API key is empty.", requestId: log.id },
        { status: 400 }
      );
    }
    log.info("calling models endpoint", {
      keyHint: `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`,
    });
    const models = await log.step("list models", () => listModels(apiKey));
    const names = models
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /^(gemini|gemma)/i.test(n));
    log.info("key works", {
      total: models.length,
      generativeCount: names.length,
    });
    return Response.json({
      ok: true,
      modelCount: models.length,
      models: names,
      requestId: log.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("test failed", { err: message });
    return Response.json(
      { error: message, requestId: log.id },
      { status: 400 }
    );
  }
}
