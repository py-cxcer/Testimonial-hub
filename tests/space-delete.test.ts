import { describe, it, expect, vi, beforeEach } from "vitest";

const SPACE = "11111111-1111-1111-1111-111111111111";

function setup(opts: {
  user: { id: string } | null;
  deleted?: { id: string }[] | null;
  error?: { code: string; message: string } | null;
  files?: { name: string }[];
}) {
  const filters: [string, unknown][] = [];
  const remove = vi.fn().mockResolvedValue({ error: null });
  const list = vi.fn().mockResolvedValue({ data: opts.files ?? [], error: null });
  const revalidatePath = vi.fn();

  const builder = {
    delete: () => builder,
    eq: (col: string, val: unknown) => {
      filters.push([col, val]);
      return builder;
    },
    select: async () => ({ data: opts.deleted ?? [], error: opts.error ?? null }),
  };

  vi.doMock("next/cache", () => ({ revalidatePath }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: opts.user } }) },
      from: () => builder,
    }),
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({ storage: { from: () => ({ list, remove }) } }),
  }));
  return { filters, remove, list, revalidatePath };
}

describe("deleteSpaceAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects malformed ids without touching the database", async () => {
    const { filters } = setup({ user: { id: "u1" } });
    const { deleteSpaceAction } = await import("@/actions/spaces");
    const res = await deleteSpaceAction("not-a-uuid");
    expect(res.ok).toBe(false);
    expect(filters).toHaveLength(0);
  });

  it("requires a signed-in user", async () => {
    setup({ user: null });
    const { deleteSpaceAction } = await import("@/actions/spaces");
    expect((await deleteSpaceAction(SPACE)).ok).toBe(false);
  });

  it("scopes the delete to the caller's own space and cleans up photos and caches", async () => {
    const { filters, list, remove, revalidatePath } = setup({
      user: { id: "owner-1" },
      deleted: [{ id: SPACE }],
      files: [{ name: "a.png" }, { name: "b.webp" }],
    });
    const { deleteSpaceAction } = await import("@/actions/spaces");
    const res = await deleteSpaceAction(SPACE);

    expect(res.ok).toBe(true);
    expect(filters).toEqual(
      expect.arrayContaining([
        ["id", SPACE],
        ["owner_id", "owner-1"],
      ])
    );
    expect(list).toHaveBeenCalledWith(SPACE, expect.anything());
    expect(remove).toHaveBeenCalledWith([`${SPACE}/a.png`, `${SPACE}/b.webp`]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("reports not-found (and removes nothing) when no row was deleted, e.g. someone else's space", async () => {
    const { remove } = setup({ user: { id: "intruder" }, deleted: [] });
    const { deleteSpaceAction } = await import("@/actions/spaces");
    const res = await deleteSpaceAction(SPACE);
    expect(res.ok).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it("returns a safe error (no database text) when the delete fails", async () => {
    setup({ user: { id: "u1" }, error: { code: "XX000", message: "secret detail" } });
    const { deleteSpaceAction } = await import("@/actions/spaces");
    const res = await deleteSpaceAction(SPACE);
    expect(res.ok).toBe(false);
    expect(JSON.stringify(res)).not.toContain("secret");
  });
});
