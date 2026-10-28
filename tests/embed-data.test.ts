import { describe, it, expect, vi } from "vitest";
import { getWallOfLoveTestimonials } from "@/lib/embed-data";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

function fakeAdmin(rows: Row[] | null, error: { code: string; message: string } | null = null) {
  const calls = { eq: [] as [string, unknown][], order: [] as [string, unknown][], select: "" };
  const builder = {
    select(cols: string) {
      calls.select = cols;
      return builder;
    },
    eq(col: string, val: unknown) {
      calls.eq.push([col, val]);
      return builder;
    },
    order(col: string, opts: unknown) {
      calls.order.push([col, opts]);
      // the last order() call resolves the query
      return calls.order.length === 2 ? Promise.resolve({ data: rows, error }) : builder;
    },
  };
  const admin = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
  return { admin, calls };
}

const base = {
  id: "t1",
  name: "Ann",
  company_name: "Acme",
  profile_photo_url: null,
  content: "Great product, would recommend!",
  rating: 5,
  share_consent: true,
  is_hidden: false,
  created_at: "2026-01-01T00:00:00Z",
};

describe("getWallOfLoveTestimonials", () => {
  it("queries only curated + consented + visible testimonials of the space, favorites first", async () => {
    const { admin, calls } = fakeAdmin([base]);
    await getWallOfLoveTestimonials(admin, "space-1");

    expect(admin.from).toHaveBeenCalledWith("testimonials");
    expect(calls.eq).toEqual(
      expect.arrayContaining([
        ["space_id", "space-1"],
        ["share_consent", true],
        ["is_hidden", false],
        ["on_wall_of_love", true],
      ])
    );
    expect(calls.order[0][0]).toBe("is_favorite");
    expect(calls.order[1][0]).toBe("created_at");
  });

  it("never selects the email column", async () => {
    const { admin, calls } = fakeAdmin([base]);
    await getWallOfLoveTestimonials(admin, "space-1");
    expect(calls.select).not.toMatch(/email/);
  });

  it("returns only the public DTO fields (no email, consent or moderation flags) even if extra columns leak in", async () => {
    const leaky = { ...base, email: "ann@secret.com", is_favorite: true, on_wall_of_love: true, owner_id: "o1" };
    const { admin } = fakeAdmin([leaky]);
    const [dto] = await getWallOfLoveTestimonials(admin, "space-1");

    expect(Object.keys(dto).sort()).toEqual(
      ["company_name", "content", "created_at", "id", "name", "profile_photo_url", "rating"].sort()
    );
    expect(JSON.stringify(dto)).not.toContain("secret.com");
  });

  it("drops rows that fail the consent/hidden rule even if the database returned them", async () => {
    const { admin } = fakeAdmin([
      { ...base, id: "ok" },
      { ...base, id: "no-consent", share_consent: false },
      { ...base, id: "hidden", is_hidden: true },
    ]);
    const result = await getWallOfLoveTestimonials(admin, "space-1");
    expect(result.map((r) => r.id)).toEqual(["ok"]);
  });

  it("returns an empty list when there are no rows", async () => {
    const { admin } = fakeAdmin(null);
    expect(await getWallOfLoveTestimonials(admin, "space-1")).toEqual([]);
  });

  it("throws a safe error (no database details) when the query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = fakeAdmin(null, { code: "XX000", message: "secret db detail" });
    await expect(getWallOfLoveTestimonials(admin, "space-1")).rejects.toThrow("Could not load the Wall of Love");
  });
});
