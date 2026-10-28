export const PLAN_LIMITS = {
  free: { spaces: 3, testimonialsPerSpace: 100 },
  pro: { spaces: 25, testimonialsPerSpace: 1000 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export const PRO_PRICE_USD_PER_MONTH = 9.99;

export function getLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

/**
 * Single source of truth for entitlement. A row only grants Pro when the plan
 * is "pro" AND the status is "active"; anything else (missing row, unknown
 * values) falls back to Free. The database enforces the same rule in is_pro().
 */
export function resolvePlan(
  sub: { plan: string; status: string } | null | undefined
): Plan {
  return sub?.plan === "pro" && sub.status === "active" ? "pro" : "free";
}
