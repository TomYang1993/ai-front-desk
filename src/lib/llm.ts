import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import { env } from "./env";
import { PROVIDERS, ProviderError, parseModelSpec } from "./providers";

/**
 * The AI adapter. The rest of the app asks for a "small" or "large" model
 * and a zod schema, and gets validated JSON back. This file decides which
 * model answers: it walks the model order for the step, skipping models that
 * are cooling down, out of daily quota, or missing a key. providers.ts does
 * the actual calls.
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
  /** The model that answered, as "provider:model". */
  model: string;
  /** True when the first-choice model failed and a fallback answered. */
  fellBack: boolean;
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

/** Thrown when no model can answer, so callers can hand off gracefully. */
export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: "not_configured" | "rate_limited" | "failed" | "bad_output",
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

/** A per-request model order, for tests that compare models. Never used in production. */
const modelOverride = new AsyncLocalStorage<Partial<Record<ModelTier, string[]>>>();
export const withModels = <T>(override: Partial<Record<ModelTier, string[]>>, fn: () => Promise<T>) =>
  modelOverride.run(override, fn);

/** The configured model order for a step, as "provider:model", skipping providers without a key. */
export function modelChain(tier: ModelTier): string[] {
  const override = modelOverride.getStore()?.[tier];
  const specs = override?.length ? override : tier === "small" ? env.modelsSmall : env.modelsLarge;
  return specs.filter((spec) => {
    const { provider } = parseModelSpec(spec);
    return PROVIDERS[provider]?.configured() ?? false;
  });
}

export const modelFor = (tier: ModelTier) => modelChain(tier)[0] ?? "(none configured)";

export const configuredProviders = () =>
  Object.values(PROVIDERS)
    .filter((p) => p.configured())
    .map((p) => p.id);

/**
 * Models that hit a daily quota are skipped until it resets, and models that
 * time out or report overload sit out for two minutes. Kept per server instance.
 */
const exhaustedUntil = new Map<string, number>();
const coolingUntil = new Map<string, number>();
const COOLDOWN_MS = 120_000;
const available = (spec: string) =>
  (exhaustedUntil.get(spec) ?? 0) <= Date.now() && (coolingUntil.get(spec) ?? 0) <= Date.now();

const active = (m: Map<string, number>) =>
  [...m.entries()].filter(([, until]) => until > Date.now()).map(([spec]) => spec);
export const coolingModels = () => active(coolingUntil);
export const exhaustedModels = () => active(exhaustedUntil);

/** A parent shouldn't wait on one slow call; past this, try the next model. */
const TIMEOUT_MS: Record<ModelTier, number> = { small: 7_000, large: 12_000 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** JSON Schema for a zod schema, without the "$schema" header some providers reject. */
function jsonSchemaFor(schema: z.ZodType): Record<string, unknown> {
  const out = z.toJSONSchema(schema) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

export async function generateJson<S extends z.ZodType>(req: JsonRequest<S>, only?: string): Promise<JsonResult<z.infer<S>>> {
  const started = Date.now();
  const chain = only ? [only] : modelChain(req.tier);
  if (!chain.length) throw new LlmUnavailableError("No AI provider is configured", "not_configured");
  const jsonSchema = jsonSchemaFor(req.schema);
  let lastError: LlmUnavailableError | undefined;

  // If every model is sitting out, try them anyway rather than fail outright.
  const usable = chain.filter(available);
  const order = usable.length ? usable : chain;

  for (const spec of order) {
    const { provider, model } = parseModelSpec(spec);
    const p = PROVIDERS[provider];
    if (!p?.configured()) continue;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const out = await p.call(model, {
          system: req.system,
          prompt: req.prompt,
          jsonSchema,
          temperature: req.temperature ?? 0.2,
          timeoutMs: TIMEOUT_MS[req.tier],
        });
        let parsed: unknown;
        try {
          parsed = JSON.parse(out.text);
        } catch {
          throw new LlmUnavailableError(`${spec} returned invalid JSON`, "bad_output");
        }
        const result = req.schema.safeParse(parsed);
        if (!result.success) {
          throw new LlmUnavailableError(`${spec} output failed validation: ${result.error.message}`, "bad_output");
        }
        return {
          data: result.data,
          model: spec,
          fellBack: chain.indexOf(spec) > 0,
          inputTokens: out.inputTokens,
          outputTokens: out.outputTokens,
          ms: Date.now() - started,
        };
      } catch (err) {
        if (err instanceof LlmUnavailableError) {
          // A malformed answer is worth one retry on the same model.
          lastError = err;
          if (attempt === 1) continue;
          break;
        }
        const e = err instanceof ProviderError ? err : new ProviderError(String(err), "other");
        lastError = new LlmUnavailableError(
          `${spec}: ${e.message}`,
          e.kind === "rate_limit_minute" || e.kind === "rate_limit_day" ? "rate_limited" : "failed",
        );
        if (e.kind === "timeout") {
          // A timeout already cost the parent several seconds, so move on.
          coolingUntil.set(spec, Date.now() + COOLDOWN_MS);
          break;
        }
        if (e.kind === "rate_limit_day") {
          exhaustedUntil.set(spec, Date.now() + (e.retryAfterMs ?? 3_600_000));
          break;
        }
        if (e.kind === "overloaded") {
          if (attempt === 1) {
            await sleep(400 + Math.random() * 300);
            continue;
          }
          coolingUntil.set(spec, Date.now() + COOLDOWN_MS);
          break;
        }
        if (e.kind === "rate_limit_minute" && attempt === 1) {
          // A brief pause often clears a per-minute limit. When no other model
          // is left, wait as long as the provider asks, up to 15 seconds.
          const lastChoice = spec === order[order.length - 1];
          const asked = e.retryAfterMs && e.retryAfterMs <= 15_000 ? e.retryAfterMs + 250 : undefined;
          await sleep(lastChoice && asked ? asked : 1500 + Math.random() * 500);
          continue;
        }
        // Rejected requests and anything else: move to the next model.
        break;
      }
    }
  }
  throw lastError ?? new LlmUnavailableError("No model available", "failed");
}
