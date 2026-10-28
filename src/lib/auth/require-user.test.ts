import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLimits } from "@/lib/plans";
import { z } from "zod";

describe("Plan limits", () => {
  it("enforces Free plan limits strictly to 3 spaces and 100 testimonials per space", () => {
    const freeLimits = getLimits("free");
    expect(freeLimits.spaces).toBe(3);
    expect(freeLimits.testimonialsPerSpace).toBe(100);
  });

  it("enforces Pro plan limits strictly to 25 spaces and 1000 testimonials per space", () => {
    const proLimits = getLimits("pro");
    expect(proLimits.spaces).toBe(25);
    expect(proLimits.testimonialsPerSpace).toBe(1000);
  });
});

describe("Auth requireUser helper", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("redirects unauthenticated users to /login", async () => {
    const mockRedirect = vi.fn();
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: null },
            error: new Error("Auth session missing"),
          }),
        },
      }),
    }));

    const { requireUser } = await import("@/lib/auth/require-user");
    await requireUser();

    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("returns user when authenticated", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.doMock("next/navigation", () => ({
      redirect: vi.fn(),
    }));

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: mockUser }, error: null }),
        },
      }),
    }));

    const { requireUser } = await import("@/lib/auth/require-user");
    const result = await requireUser();
    expect(result.user).toEqual(mockUser);
  });

  it("safely redirects to /login when getUser throws a network exception (fetch failed)", async () => {
    const mockRedirect = vi.fn();
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => {
            throw new TypeError("fetch failed");
          },
        },
      }),
    }));

    const { requireUser } = await import("@/lib/auth/require-user");
    await requireUser();

    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});


describe("Environment schema validation", () => {
  const envSchema = z.object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  });

  it("validates compliant environment configuration", () => {
    const valid = {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-123",
    };
    expect(envSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid URLs in environment configuration", () => {
    const invalid = {
      NEXT_PUBLIC_APP_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_URL: "invalid-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    };
    expect(envSchema.safeParse(invalid).success).toBe(false);
  });
});
