// In-memory sliding window rate limiter
// Keyed by hashed client identifier (e.g. IP + endpoint)
interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { windowMs: 60 * 1000, maxRequests: 5 }
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - options.windowMs;

  const record = memoryStore.get(key) || { timestamps: [] };

  // Remove timestamps outside window
  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= options.maxRequests) {
    const oldestTimestamp = activeTimestamps[0];
    return {
      success: false,
      remaining: 0,
      resetTime: oldestTimestamp + options.windowMs,
    };
  }

  activeTimestamps.push(now);
  memoryStore.set(key, { timestamps: activeTimestamps });

  // Periodically clean up stale keys
  if (memoryStore.size > 1000) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.timestamps.every((ts) => ts <= windowStart)) {
        memoryStore.delete(k);
      }
    }
  }

  return {
    success: true,
    remaining: options.maxRequests - activeTimestamps.length,
    resetTime: now + options.windowMs,
  };
}
