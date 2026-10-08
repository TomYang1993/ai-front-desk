import "server-only";

/**
 * Server-side configuration. Every value is optional so the app can run
 * locally before any accounts are connected; callers check what they need.
 */

/**
 * Default model order for each step, as "provider:model". Entries for
 * providers without a key are skipped.
 *
 * Groq goes first: it passed every scorecard question it answered and
 * responds in about a second, with 1,000 requests a day per model. Its
 * free tier allows only 8,000 tokens a minute per model, about three
 * questions a minute, so bursts spill over to Gemini, whose free limits
 * are per model per day and can be as low as 20.
 */
const DEFAULT_SMALL = [
  "groq:openai/gpt-oss-20b",
  "gemini:gemini-3.5-flash-lite",
  "gemini:gemini-3.1-flash-lite",
  "gemini:gemini-2.5-flash-lite",
].join(",");

const DEFAULT_LARGE = [
  "groq:openai/gpt-oss-120b",
  "gemini:gemini-3.6-flash",
  "gemini:gemini-3.5-flash",
  "gemini:gemini-3.5-flash-lite",
  "gemini:gemini-3.1-flash-lite",
].join(",");

const list = (value: string) =>
  value
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  groqApiKey: process.env.GROQ_API_KEY || undefined,
  /** Optional local models, for example http://localhost:11434/v1 for Ollama. */
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || undefined,
  /** Used for understanding, translation and the claim check. */
  modelsSmall: list(process.env.MODELS_SMALL || DEFAULT_SMALL),
  /** Used for reading the handbook. */
  modelsLarge: list(process.env.MODELS_LARGE || DEFAULT_LARGE),
  redisUrl:
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || undefined,
  redisToken:
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
};

export const hasGemini = () => Boolean(env.geminiApiKey);
export const hasGroq = () => Boolean(env.groqApiKey);
export const hasRedis = () => Boolean(env.redisUrl && env.redisToken);
