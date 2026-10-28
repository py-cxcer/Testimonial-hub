import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const from = vi.fn();

function post(body: unknown, ip: string) {
  return new NextRequest("http://localhost/api/testimonials", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/testimonials", () => {
  beforeEach(() => {
    vi.resetModules();
    from.mockReset();
    vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from }) }));
  });

  it("silently accepts but never stores honeypot (bot) submissions", async () => {
    const { POST } = await import("@/app/api/testimonials/route");
    const res = await POST(
      post({ slug: "my-space", content: "Great product, would recommend!", website: "http://spam" }, "10.0.0.1")
    );
    expect(res.status).toBe(200);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects javascript: profile photo URLs before touching the database", async () => {
    const { POST } = await import("@/app/api/testimonials/route");
    const res = await POST(
      post(
        { slug: "my-space", content: "Great product, would recommend!", profile_photo_url: "javascript:alert(1)" },
        "10.0.0.2"
      )
    );
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("rate limits repeated submissions from one IP", async () => {
    const { POST } = await import("@/app/api/testimonials/route");
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await POST(post({}, "10.0.0.3"))).status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 400)).toBe(true);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it("rejects a profile photo URL that was not uploaded for this space", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    const insert = vi.fn();
    from.mockImplementation((table: string) => {
      if (table === "spaces") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "11111111-1111-1111-1111-111111111111",
                  owner_id: "o1",
                  title: "T",
                  collect_rating: false,
                  field_config: {
                    name: { enabled: true, required: true },
                    email: { enabled: true, required: true },
                    profile_photo: { enabled: true, required: false },
                  },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { insert };
    });
    const { POST } = await import("@/app/api/testimonials/route");
    const res = await POST(
      post(
        {
          slug: "my-space",
          name: "Ann",
          email: "ann@example.com",
          content: "Great product, would recommend!",
          profile_photo_url: "https://tracker.example/pixel.png",
        },
        "10.0.0.5"
      )
    );
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("returns 403 with a friendly message when the database limit trigger fires", async () => {
    const space = {
      data: {
        id: "s1",
        owner_id: "o1",
        title: "T",
        collect_rating: false,
        field_config: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: true },
        },
      },
      error: null,
    };
    from.mockImplementation((table: string) => {
      if (table === "spaces") {
        return { select: () => ({ eq: () => ({ single: async () => space }) }) };
      }
      if (table === "subscriptions") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { plan: "free", status: "free" } }) }) }) };
      }
      // testimonials: head count below limit (pre-check passes) then insert hits the trigger
      return {
        select: (_cols: string, opts?: { head?: boolean }) =>
          opts?.head ? { eq: async () => ({ count: 0, error: null }) } : {},
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: { code: "P0001", message: "TESTIMONIAL_LIMIT_REACHED: 100 testimonials allowed for this space" },
            }),
          }),
        }),
      };
    });

    const { POST } = await import("@/app/api/testimonials/route");
    const res = await POST(
      post(
        { slug: "my-space", name: "Ann", email: "ann@example.com", content: "Great product, would recommend!" },
        "10.0.0.4"
      )
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/limit/i);
    expect(JSON.stringify(json)).not.toContain("P0001");
  });
});
