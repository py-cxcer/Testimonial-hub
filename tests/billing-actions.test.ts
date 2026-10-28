import { describe, it, expect, vi, beforeEach } from "vitest";

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`redirect:${url}`);
  }
}

function setup(opts: {
  user: { id: string } | null;
  rpcError?: { code: string; message: string } | null;
}) {
  const rpc = vi.fn().mockResolvedValue({ error: opts.rpcError ?? null });
  const revalidatePath = vi.fn();
  vi.doMock("next/navigation", () => ({
    redirect: (url: string) => {
      throw new RedirectSignal(url);
    },
  }));
  vi.doMock("next/cache", () => ({ revalidatePath }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: opts.user } }) },
      rpc,
    }),
  }));
  return { rpc, revalidatePath };
}

async function redirectTarget(fn: () => Promise<void>): Promise<string> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof RedirectSignal) return e.url;
    throw e;
  }
  throw new Error("expected a redirect");
}

describe("demo billing actions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("upgrades via set_demo_plan('pro') using only the session, never a client-supplied user id", async () => {
    const { rpc, revalidatePath } = setup({ user: { id: "u1" } });
    const { confirmDemoUpgradeAction } = await import("@/actions/billing");

    const target = await redirectTarget(confirmDemoUpgradeAction);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("set_demo_plan", { p_plan: "pro" });
    expect(revalidatePath).toHaveBeenCalled();
    expect(target).toBe("/billing?notice=upgraded");
  });

  it("returns to free via set_demo_plan('free')", async () => {
    const { rpc } = setup({ user: { id: "u1" } });
    const { switchToFreePlanAction } = await import("@/actions/billing");

    const target = await redirectTarget(switchToFreePlanAction);

    expect(rpc).toHaveBeenCalledWith("set_demo_plan", { p_plan: "free" });
    expect(target).toBe("/billing?notice=downgraded");
  });

  it("redirects unauthenticated callers to login without touching the database", async () => {
    const { rpc } = setup({ user: null });
    const { confirmDemoUpgradeAction } = await import("@/actions/billing");

    expect(await redirectTarget(confirmDemoUpgradeAction)).toBe("/login");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports a safe error (no raw database message) when the RPC fails", async () => {
    const { revalidatePath } = setup({
      user: { id: "u1" },
      rpcError: { code: "XX000", message: "secret internal detail" },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { confirmDemoUpgradeAction } = await import("@/actions/billing");

    const target = await redirectTarget(confirmDemoUpgradeAction);

    expect(target).toBe("/billing?notice=error");
    expect(target).not.toContain("secret");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
