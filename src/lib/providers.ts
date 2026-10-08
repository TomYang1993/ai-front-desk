import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "./env";

/**
 * Model providers. Each one takes a prompt and a JSON schema and returns raw
 * JSON text, translating its own errors into a shared set of failure kinds.
 * The fallback order, time limits and validation live in llm.ts.
 */

export interface ProviderCall {
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  temperature: number;
  timeoutMs: number;
}

export interface ProviderResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export type FailureKind =
  | "timeout"
  | "overloaded"
  | "rate_limit_minute"
  | "rate_limit_day"
  | "rejected"
  | "other";

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: FailureKind,
    /** How long the provider asked us to wait, when it said. */
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface Provider {
  id: string;
  configured(): boolean;
  call(model: string, call: ProviderCall): Promise<ProviderResult>;
}

const isTimeout = (err: unknown) =>
  err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");

/* Google Gemini, through Google's SDK. */

let geminiClient: GoogleGenAI | undefined;

const gemini: Provider = {
  id: "gemini",
  configured: () => Boolean(env.geminiApiKey),
  async call(model, c) {
    geminiClient ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
    try {
      const r = await geminiClient.models.generateContent({
        model,
        contents: c.prompt,
        config: {
          abortSignal: AbortSignal.timeout(c.timeoutMs),
          systemInstruction: c.system,
          temperature: c.temperature,
          responseMimeType: "application/json",
          responseJsonSchema: c.jsonSchema,
        },
      });
      const u = r.usageMetadata;
      return {
        text: r.text ?? "",
        inputTokens: u?.promptTokenCount ?? 0,
        outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
      };
    } catch (err) {
      if (isTimeout(err)) throw new ProviderError(`Timed out after ${c.timeoutMs} ms`, "timeout");
      const e = err as { status?: number; code?: number; message?: string };
      const status = e.status ?? e.code;
      const message = e.message ?? String(err);
      if (status === 429) {
        if (/PerDay/i.test(message)) {
          const seconds = Number(message.match(/"retryDelay":\s*"(\d+)s"/)?.[1] ?? 3600);
          throw new ProviderError(message, "rate_limit_day", seconds * 1000);
        }
        const wait = Number(message.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)?.[1]);
        throw new ProviderError(message, "rate_limit_minute", wait ? wait * 1000 : undefined);
      }
      if (status === 500 || status === 503) throw new ProviderError(message, "overloaded");
      if (status === 400 || status === 404) throw new ProviderError(message, "rejected");
      throw new ProviderError(message, "other");
    }
  },
};

/* Any API that speaks the OpenAI chat completions format: Groq, Ollama, OpenRouter. */

/** "1h2m3.5s", "7m30s" or "12.5s" in milliseconds. */
function parseWait(text: string): number | undefined {
  const m = text.match(/try again in ((?:\d+h)?(?:\d+m)?(?:[\d.]+s)?)/i);
  if (!m?.[1]) return undefined;
  const h = Number(m[1].match(/(\d+)h/)?.[1] ?? 0);
  const min = Number(m[1].match(/(\d+)m(?!s)/)?.[1] ?? 0);
  const s = Number(m[1].match(/([\d.]+)s/)?.[1] ?? 0);
  return ((h * 60 + min) * 60 + s) * 1000;
}

function openAICompatible(opts: {
  id: string;
  baseUrl: () => string | undefined;
  apiKey: () => string | undefined;
  /** Models that enforce a JSON schema exactly; others get JSON mode plus the schema in the prompt. */
  strictSchema: (model: string) => boolean;
  extraBody?: (model: string) => Record<string, unknown>;
}): Provider {
  return {
    id: opts.id,
    configured: () => Boolean(opts.baseUrl() && opts.apiKey()),
    async call(model, c) {
      const strict = opts.strictSchema(model);
      const system = strict
        ? c.system
        : `${c.system}\n\nReturn only a JSON object that matches this JSON Schema:\n${JSON.stringify(c.jsonSchema)}`;
      let res: Response;
      try {
        res = await fetch(`${opts.baseUrl()}/chat/completions`, {
          method: "POST",
          signal: AbortSignal.timeout(c.timeoutMs),
          headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey()}` },
          body: JSON.stringify({
            model,
            temperature: c.temperature,
            max_completion_tokens: 2048,
            messages: [
              { role: "system", content: system },
              { role: "user", content: c.prompt },
            ],
            response_format: strict
              ? { type: "json_schema", json_schema: { name: "reply", strict: true, schema: c.jsonSchema } }
              : { type: "json_object" },
            ...(opts.extraBody?.(model) ?? {}),
          }),
        });
      } catch (err) {
        if (isTimeout(err)) throw new ProviderError(`Timed out after ${c.timeoutMs} ms`, "timeout");
        throw new ProviderError(err instanceof Error ? err.message : String(err), "other");
      }

      if (!res.ok) {
        const body = (await res.text()).slice(0, 500);
        const message = `${opts.id} ${res.status}: ${body}`;
        if (res.status === 429) {
          if (/per day|\bRPD\b|\bTPD\b|daily/i.test(body)) {
            const header = Number(res.headers.get("retry-after"));
            throw new ProviderError(message, "rate_limit_day", parseWait(body) ?? (header ? header * 1000 : 3_600_000));
          }
          const header = Number(res.headers.get("retry-after"));
          throw new ProviderError(message, "rate_limit_minute", parseWait(body) ?? (header ? header * 1000 : undefined));
        }
        if (res.status >= 500) throw new ProviderError(message, "overloaded");
        // 400 covers schema failures; 413 means the prompt exceeds the per-minute token limit.
        if (res.status === 400 || res.status === 404 || res.status === 413) throw new ProviderError(message, "rejected");
        throw new ProviderError(message, "other");
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        text: json.choices?.[0]?.message?.content ?? "",
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
      };
    },
  };
}

const groq = openAICompatible({
  id: "groq",
  baseUrl: () => "https://api.groq.com/openai/v1",
  apiKey: () => env.groqApiKey,
  strictSchema: (model) => /^openai\/gpt-oss-(20b|120b)$|^qwen\//.test(model),
  // GPT-OSS models reason before answering; low effort keeps them fast.
  extraBody: (model) => (model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
});

const ollama = openAICompatible({
  id: "ollama",
  baseUrl: () => env.ollamaBaseUrl,
  apiKey: () => (env.ollamaBaseUrl ? "ollama" : undefined),
  strictSchema: () => false,
});

export const PROVIDERS: Record<string, Provider> = { gemini, groq, ollama };

/** Splits "groq:openai/gpt-oss-20b" into provider and model. Bare names mean Gemini. */
export function parseModelSpec(spec: string): { provider: string; model: string } {
  const i = spec.indexOf(":");
  return i > 0 ? { provider: spec.slice(0, i), model: spec.slice(i + 1) } : { provider: "gemini", model: spec };
}
