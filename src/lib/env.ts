import "server-only";

/**
 * Server-side configuration. Every value is optional so the app can run
 * locally before any accounts are connected; callers check what they need.
 */
export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  geminiModelSmall: process.env.GEMINI_MODEL_SMALL || "gemini-flash-lite-latest",
  geminiModelLarge: process.env.GEMINI_MODEL_LARGE || "gemini-flash-latest",
  redisUrl:
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || undefined,
  redisToken:
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
};

export const hasGemini = () => Boolean(env.geminiApiKey);
export const hasRedis = () => Boolean(env.redisUrl && env.redisToken);
