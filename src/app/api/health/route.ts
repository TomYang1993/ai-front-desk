import { connection } from "next/server";
import { z } from "zod";
import { env, hasRedis } from "@/lib/env";
import { getStore } from "@/lib/store";
import {
  configuredProviders,
  coolingModels,
  exhaustedModels,
  generateJson,
  LlmUnavailableError,
  modelChain,
  type ModelTier,
} from "@/lib/llm";

/**
 * Setup check.
 * GET /api/health            what is configured
 * GET /api/health?live=1     round-trips the database and calls the first model of each step
 * GET /api/health?live=all   also calls every configured model once, to verify each provider
 */
export async function GET(request: Request) {
  await connection();
  const live = new URL(request.url).searchParams.get("live");

  const config = {
    providers: configuredProviders(),
    models: {
      small: modelChain("small"),
      large: modelChain("large"),
      skippedWithoutKey: [...new Set([...env.modelsSmall, ...env.modelsLarge])].filter(
        (m) => !modelChain("small").includes(m) && !modelChain("large").includes(m),
      ),
      dailyLimitReached: exhaustedModels(),
      coolingDown: coolingModels(),
    },
    database: hasRedis() ? "redis" : "in-memory (local only, data resets on restart)",
    environment: process.env.VERCEL_ENV ?? "local",
  };
  if (!live) return Response.json({ ok: true, config });

  const checks: Record<string, string> = {};
  try {
    const store = getStore();
    const stamp = new Date().toISOString();
    await store.set("health:ping", { stamp });
    const back = await store.get<{ stamp: string }>("health:ping");
    checks.database = back?.stamp === stamp ? `ok (${store.kind})` : "read-back mismatch";
  } catch (err) {
    checks.database = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  const Pong = z.object({ reply: z.string() });
  const ping = async (tier: ModelTier, only?: string) => {
    try {
      const r = await generateJson(
        { tier, system: "You are a health check. Respond with JSON only.", prompt: 'Return {"reply": "ok"}.', schema: Pong, temperature: 0 },
        only,
      );
      return `ok: ${r.model}, ${r.ms} ms, ${r.inputTokens + r.outputTokens} tokens`;
    } catch (err) {
      const reason = err instanceof LlmUnavailableError ? err.reason : "failed";
      return `${reason}: ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`;
    }
  };

  if (live === "all") {
    const specs = [...new Set([...modelChain("small"), ...modelChain("large")])];
    for (const spec of specs) checks[spec] = await ping(modelChain("small").includes(spec) ? "small" : "large", spec);
  } else {
    for (const tier of ["small", "large"] as ModelTier[]) checks[`model_${tier}`] = await ping(tier);
  }

  const ok = Object.values(checks).every((v) => v.startsWith("ok"));
  return Response.json({ ok, config, checks }, { status: ok ? 200 : 503 });
}
