import "server-only";
import { Redis } from "@upstash/redis";
import { env, hasRedis } from "./env";

/**
 * A small key-value store shared by the parent app and the operator console.
 * Uses Upstash Redis when configured, otherwise an in-memory map that lives
 * only as long as the local dev server.
 */
export interface Store {
  readonly kind: "redis" | "memory";
  get<T>(key: string): Promise<T | null>;
  /** Optionally expires after a number of seconds. */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Append to the end of a list. */
  push<T>(key: string, value: T): Promise<void>;
  /** Append many values in as few round trips as possible. */
  pushMany<T>(key: string, values: T[]): Promise<void>;
  /** Read a list; negative indexes count from the end, like Redis LRANGE. */
  range<T>(key: string, start?: number, stop?: number): Promise<T[]>;
  incr(key: string, by?: number): Promise<number>;
}

// One database can serve production, previews and local development, so each
// environment gets its own key space. Local testing never touches the live demo.
const PREFIX = `afd:${process.env.VERCEL_ENV ?? "local"}:`;

class RedisStore implements Store {
  readonly kind = "redis" as const;
  constructor(private redis: Redis) {}
  async get<T>(key: string) {
    return (await this.redis.get<T>(PREFIX + key)) ?? null;
  }
  async set<T>(key: string, value: T, ttlSeconds?: number) {
    if (ttlSeconds) await this.redis.set(PREFIX + key, value, { ex: ttlSeconds });
    else await this.redis.set(PREFIX + key, value);
  }
  async del(key: string) {
    await this.redis.del(PREFIX + key);
  }
  async push<T>(key: string, value: T) {
    await this.redis.rpush(PREFIX + key, value);
  }
  async pushMany<T>(key: string, values: T[]) {
    for (let i = 0; i < values.length; i += 200) {
      const chunk = values.slice(i, i + 200);
      if (chunk.length) await this.redis.rpush(PREFIX + key, ...chunk);
    }
  }
  async range<T>(key: string, start = 0, stop = -1) {
    return this.redis.lrange<T>(PREFIX + key, start, stop);
  }
  async incr(key: string, by = 1) {
    return this.redis.incrby(PREFIX + key, by);
  }
}

interface MemoryData {
  values: Map<string, unknown>;
  lists: Map<string, unknown[]>;
}

class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private values: Map<string, unknown>;
  private lists: Map<string, unknown[]>;
  constructor(data: MemoryData) {
    this.values = data.values;
    this.lists = data.lists;
  }
  // Values are cloned so callers can't mutate stored state by accident,
  // matching how Redis round-trips through JSON.
  private clone<T>(v: T): T {
    return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
  }
  private expires = new Map<string, number>();
  async get<T>(key: string) {
    const exp = this.expires.get(key);
    if (exp && exp < Date.now()) {
      this.values.delete(key);
      this.expires.delete(key);
    }
    return this.values.has(key) ? this.clone(this.values.get(key) as T) : null;
  }
  async set<T>(key: string, value: T, ttlSeconds?: number) {
    this.values.set(key, this.clone(value));
    if (ttlSeconds) this.expires.set(key, Date.now() + ttlSeconds * 1000);
    else this.expires.delete(key);
  }
  async del(key: string) {
    this.values.delete(key);
    this.lists.delete(key);
  }
  async push<T>(key: string, value: T) {
    const list = this.lists.get(key) ?? [];
    list.push(this.clone(value));
    this.lists.set(key, list);
  }
  async pushMany<T>(key: string, values: T[]) {
    for (const v of values) await this.push(key, v);
  }
  async range<T>(key: string, start = 0, stop = -1) {
    const list = (this.lists.get(key) ?? []) as T[];
    const n = list.length;
    const from = start < 0 ? Math.max(n + start, 0) : start;
    const to = stop < 0 ? n + stop : Math.min(stop, n - 1);
    return to < from ? [] : this.clone(list.slice(from, to + 1));
  }
  async incr(key: string, by = 1) {
    const next = Number(this.values.get(key) ?? 0) + by;
    this.values.set(key, next);
    return next;
  }
}

// In development, keep in-memory data across hot reloads but rebuild the
// store object, so code changes to the class take effect.
const globalForStore = globalThis as unknown as { __afdMemory?: MemoryData };
let instance: Store | undefined;

export function getStore(): Store {
  if (!instance) {
    if (hasRedis()) {
      instance = new RedisStore(new Redis({ url: env.redisUrl!, token: env.redisToken! }));
    } else {
      globalForStore.__afdMemory ??= { values: new Map(), lists: new Map() };
      instance = new MemoryStore(globalForStore.__afdMemory);
    }
  }
  return instance;
}
