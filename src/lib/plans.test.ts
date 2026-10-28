import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, getLimits, resolvePlan } from "./plans";

describe("plans helper and limits", () => {
  it("defines exact limits for free and pro plans", () => {
    expect(PLAN_LIMITS.free.spaces).toBe(3);
    expect(PLAN_LIMITS.free.testimonialsPerSpace).toBe(100);
    expect(PLAN_LIMITS.pro.spaces).toBe(25);
    expect(PLAN_LIMITS.pro.testimonialsPerSpace).toBe(1000);
  });

  it("returns corresponding limits using getLimits()", () => {
    expect(getLimits("free")).toEqual({ spaces: 3, testimonialsPerSpace: 100 });
    expect(getLimits("pro")).toEqual({ spaces: 25, testimonialsPerSpace: 1000 });
  });
});

describe("resolvePlan", () => {
  it("grants pro only for an active pro subscription", () => {
    expect(resolvePlan({ plan: "pro", status: "active" })).toBe("pro");
  });

  it("falls back to free for missing, free, or non-active rows", () => {
    expect(resolvePlan(null)).toBe("free");
    expect(resolvePlan(undefined)).toBe("free");
    expect(resolvePlan({ plan: "free", status: "free" })).toBe("free");
    expect(resolvePlan({ plan: "pro", status: "past_due" })).toBe("free");
    expect(resolvePlan({ plan: "pro", status: "canceled" })).toBe("free");
    expect(resolvePlan({ plan: "enterprise", status: "active" })).toBe("free");
  });
});
