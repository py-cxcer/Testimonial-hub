import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("rate-limit sliding window limiter", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("permits requests within the window allowance", () => {
    const key = `test-ip-${Date.now()}`;
    const first = checkRateLimit(key, { windowMs: 10000, maxRequests: 3 });
    expect(first.success).toBe(true);
    expect(first.remaining).toBe(2);

    const second = checkRateLimit(key, { windowMs: 10000, maxRequests: 3 });
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(1);

    const third = checkRateLimit(key, { windowMs: 10000, maxRequests: 3 });
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);

    const blocked = checkRateLimit(key, { windowMs: 10000, maxRequests: 3 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets capacity after the window expires", () => {
    vi.useFakeTimers();
    const key = "test-window-expiry";
    const opts = { windowMs: 5000, maxRequests: 1 };

    expect(checkRateLimit(key, opts).success).toBe(true);
    expect(checkRateLimit(key, opts).success).toBe(false);

    // Fast-forward past windowMs
    vi.advanceTimersByTime(5100);

    expect(checkRateLimit(key, opts).success).toBe(true);
  });
});
