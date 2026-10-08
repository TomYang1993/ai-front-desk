import "server-only";

/**
 * Server-side configuration. Every value is optional so the app can run
 * locally before any accounts are connected; callers check what they need.
 */
export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  // Pinned versions, so answers don't shift when Google moves a "latest" alias.
  geminiModelSmall: process.env.GEMINI_MODEL_SMALL || "gemini-3.5-flash-lite",
  geminiModelLarge: process.env.GEMINI_MODEL_LARGE || "gemini-3.6-flash",
  /** Tried in order when the small model is slow or failing. */
  geminiSmallFallbacks: (process.env.GEMINI_MODEL_SMALL_FALLBACKS || "gemini-3.1-flash-lite,gemini-2.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  /** Tried in order when the large model is overloaded or failing. */
  geminiLargeFallbacks: (process.env.GEMINI_MODEL_LARGE_FALLBACKS || "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  redisUrl:
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || undefined,
  redisToken:
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
};

export const hasGemini = () => Boolean(env.geminiApiKey);
export const hasRedis = () => Boolean(env.redisUrl && env.redisToken);
