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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: number; code?: number };
  return e?.status ?? e?.code;
}

export async function generateJson<S extends z.ZodType>(
  req: JsonRequest<S>,
): Promise<JsonResult<z.infer<S>>> {
  const ai = gemini();
  const model = modelFor(req.tier);
  const started = Date.now();
  const maxAttempts = 3;

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: req.prompt,
        config: {
          systemInstruction: req.system,
          temperature: req.temperature ?? 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(req.schema),
        },
      });

      const text = response.text ?? "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new LlmUnavailableError("Model returned invalid JSON", "bad_output");
      }
      const result = req.schema.safeParse(parsed);
      if (!result.success) {
        throw new LlmUnavailableError(
          `Model output failed validation: ${result.error.message}`,
          "bad_output",
        );
      }

      const usage = response.usageMetadata;
      return {
        data: result.data,
        model,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
        ms: Date.now() - started,
      };
    } catch (err) {
      if (err instanceof LlmUnavailableError) throw err;
      const status = statusOf(err);
      const retryable = status === 429 || status === 500 || status === 503;
      if (retryable && attempt < maxAttempts) {
        // Exponential backoff with jitter: about 0.5s, then 1s.
        await sleep(500 * 2 ** (attempt - 1) + Math.random() * 250);
        continue;
      }
      throw new LlmUnavailableError(
        err instanceof Error ? err.message : String(err),
        status === 429 ? "rate_limited" : "failed",
      );
    }
  }
}
