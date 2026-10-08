import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env, hasGemini } from "./env";

/**
 * Thin provider adapter. The rest of the app asks for "small" or "large"
 * and a zod schema, and gets validated JSON back. Swapping providers means
 * changing this file only.
 */
export type ModelTier = "small" | "large";

export interface JsonRequest<S extends z.ZodType> {
  tier: ModelTier;
  system: string;
  prompt: string;
  schema: S;
  temperature?: number;
}

export interface JsonResult<T> {
  data: T;
  model: string;
  /** True when the first-choice model failed and a fallback answered. */
  fellBack: boolean;
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

/** Thrown when the AI can't be reached, so callers can hand off gracefully. */
export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: "not_configured" | "rate_limited" | "failed" | "bad_output",
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

let client: GoogleGenAI | undefined;
function gemini() {
  if (!hasGemini()) {
    throw new LlmUnavailableError("GEMINI_API_KEY is not set", "not_configured");
  }
  client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

export const modelFor = (tier: ModelTier) =>
  tier === "small" ? env.geminiModelSmall : env.geminiModelLarge;

/** Models to try in order when Google is slow or overloaded. */
const modelChain = (tier: ModelTier) =>
  tier === "small"
    ? [env.geminiModelSmall, ...env.geminiSmallFallbacks]
    : [env.geminiModelLarge, ...env.geminiLargeFallbacks];

/**
 * Models that hit a daily quota are skipped until it resets, so a parent
 * never waits on a model that can't answer. Kept per server instance.
 */
const exhaustedUntil = new Map<string, number>();

function dailyQuotaReset(message: string): number | null {
  if (!/PerDay/i.test(message)) return null;
  const seconds = Number(message.match(/"retryDelay":\s*"(\d+)s"/)?.[1] ?? 3600);
  return Date.now() + seconds * 1000;
}

/** Models that just timed out or reported overload sit out briefly. */
const coolingUntil = new Map<string, number>();
const COOLDOWN_MS = 120_000;
const available = (model: string) =>
  (exhaustedUntil.get(model) ?? 0) <= Date.now() && (coolingUntil.get(model) ?? 0) <= Date.now();

export const coolingModels = () =>
  [...coolingUntil.entries()].filter(([, until]) => until > Date.now()).map(([m]) => m);

export const exhaustedModels = () =>
  [...exhaustedUntil.entries()].filter(([, until]) => until > Date.now()).map(([m]) => m);

/** A parent shouldn't wait on one slow call; past this, try the next model. */
const TIMEOUT_MS: Record<ModelTier, number> = { small: 7_000, large: 12_000 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: number; code?: number };
  return e?.status ?? e?.code;
}

async function callModel<S extends z.ZodType>(
  ai: GoogleGenAI,
  model: string,
  req: JsonRequest<S>,
): Promise<Omit<JsonResult<z.infer<S>>, "ms" | "model" | "fellBack">> {
  const response = await ai.models.generateContent({
    model,
    contents: req.prompt,
    config: {
      abortSignal: AbortSignal.timeout(TIMEOUT_MS[req.tier]),
      systemInstruction: req.system,
      temperature: req.temperature ?? 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(req.schema),
    },
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text ?? "");
  } catch {
    throw new LlmUnavailableError("Model returned invalid JSON", "bad_output");
  }
  const result = req.schema.safeParse(parsed);
  if (!result.success) {
    throw new LlmUnavailableError(`Model output failed validation: ${result.error.message}`, "bad_output");
  }
  const usage = response.usageMetadata;
  return {
    data: result.data,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
  };
}

export async function generateJson<S extends z.ZodType>(
  req: JsonRequest<S>,
): Promise<JsonResult<z.infer<S>>> {
  const ai = gemini();
  const started = Date.now();
  const chain = modelChain(req.tier);
  let lastError: LlmUnavailableError | undefined;

  // If every model is sitting out, try them anyway rather than fail outright.
  const usable = chain.filter(available);
  const order = usable.length ? usable : chain;
  for (const model of order) {
    const index = chain.indexOf(model);
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const out = await callModel(ai, model, req);
        return { ...out, model, fellBack: index > 0, ms: Date.now() - started };
      } catch (err) {
        if (err instanceof LlmUnavailableError) {
          // A malformed answer is worth one retry on the same model.
          lastError = err;
          if (attempt === 1) continue;
          break;
        }
        const status = statusOf(err);
        const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
        lastError = new LlmUnavailableError(
          timedOut ? `Timed out after ${TIMEOUT_MS[req.tier]} ms` : err instanceof Error ? err.message : String(err),
          status === 429 ? "rate_limited" : "failed",
        );
        // A timeout already cost the parent several seconds, so move on.
        if (timedOut) {
          coolingUntil.set(model, Date.now() + COOLDOWN_MS);
          break;
        }
        const reset = status === 429 && err instanceof Error ? dailyQuotaReset(err.message) : null;
        if (reset) {
          exhaustedUntil.set(model, reset);
          break;
        }
        const overloaded = status === 503 || status === 500;
        if (overloaded && attempt === 1) {
          await sleep(400 + Math.random() * 300);
          continue;
        }
        if (overloaded) coolingUntil.set(model, Date.now() + COOLDOWN_MS);
        // A brief pause often clears a per-minute rate limit.
        if (status === 429 && attempt === 1) {
          await sleep(1500 + Math.random() * 500);
          continue;
        }
        // Rate limits are per model, so move straight to the next one.
        break;
      }
    }
  }
  throw lastError ?? new LlmUnavailableError("No model available", "failed");
}
