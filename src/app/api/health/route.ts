import { connection } from "next/server";
import { z } from "zod";
import { env, hasGemini, hasRedis } from "@/lib/env";
import { getStore } from "@/lib/store";
import { coolingModels, exhaustedModels, generateJson, LlmUnavailableError, modelFor, type ModelTier } from "@/lib/llm";

/**
 * Setup check. GET /api/health shows what is configured.
 * GET /api/health?live=1 also round-trips the database and calls each model once.
 */
export async function GET(request: Request) {
  await connection();
  const live = new URL(request.url).searchParams.get("live") === "1";

  const config = {
    gemini: hasGemini() ? "configured" : "missing GEMINI_API_KEY",
    models: {
      small: [env.geminiModelSmall, ...env.geminiSmallFallbacks],
      large: [env.geminiModelLarge, ...env.geminiLargeFallbacks],
      dailyLimitReached: exhaustedModels(),
      coolingDown: coolingModels(),
    },
    database: hasRedis() ? "redis" : "in-memory (local only, data resets on restart)",
    environment: process.env.VERCEL_ENV ?? "local",
  };
  if (!live) return Response.json({ ok: true, config });

  const checks: Record<string, unknown> = {};

  try {
    const store = getStore();
    const key = "health:ping";
    const stamp = new Date().toISOString();
    await store.set(key, { stamp });
    const back = await store.get<{ stamp: string }>(key);
    checks.database = back?.stamp === stamp ? `ok (${store.kind})` : "read-back mismatch";
  } catch (err) {
    checks.database = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  const Pong = z.object({ reply: z.string() });
  for (const tier of ["small", "large"] as ModelTier[]) {
    try {
      const r = await generateJson({
        tier,
        system: "You are a health check. Respond with JSON only.",
        prompt: 'Return {"reply": "ok"}.',
        schema: Pong,
        temperature: 0,
      });
      checks[`model_${tier}`] = `ok: ${r.model}, ${r.ms} ms, ${r.inputTokens + r.outputTokens} tokens`;
    } catch (err) {
      const reason = err instanceof LlmUnavailableError ? err.reason : "failed";
      checks[`model_${tier}`] = `${reason}: ${modelFor(tier)}: ${
        err instanceof Error ? err.message.slice(0, 300) : String(err)
      }`;
    }
  }

  const ok = Object.values(checks).every((v) => String(v).startsWith("ok"));
  return Response.json({ ok, config, checks }, { status: ok ? 200 : 503 });
}
