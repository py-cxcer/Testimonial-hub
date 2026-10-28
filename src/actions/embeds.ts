"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { embedConfigSchema, type EmbedConfigInput } from "@/lib/validation/embeds";

export type EmbedActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; issues?: unknown };

export async function saveEmbedConfigAction(
  rawInput: unknown
): Promise<EmbedActionResult<{ id: string }>> {
  const parsed = embedConfigSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the form fields",
      issues: parsed.error.flatten(),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Please sign in" };

  const input: EmbedConfigInput = parsed.data;

  // Verify space ownership before saving config
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id")
    .eq("id", input.spaceId)
    .eq("owner_id", user.id)
    .single();

  if (spaceError || !space) {
    return {
      ok: false,
      error: "You can only configure embeds for spaces you own.",
    };
  }

  // Upsert embed configuration
  const { data, error } = await supabase
    .from("embed_configs")
    .upsert(
      {
        space_id: input.spaceId,
        owner_id: user.id,
        layout: input.layout,
        dark_mode: input.darkMode,
        background_color: input.backgroundColor,
        animation_enabled: input.animationEnabled,
        show_rating: input.showRating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "space_id,owner_id" }
    )
    .select("id")
    .single();

  if (error || !data) {
    if (error) console.error("Embed config save failed:", error.code, error.message);
    // 22P02 = invalid enum value: the database is missing migration 0005 (new widget types).
    const needsMigration = error?.code === "22P02" || /invalid input value for enum/i.test(error?.message ?? "");
    return {
      ok: false,
      error: needsMigration
        ? "This widget type needs the latest database migration (0005_widget_types.sql). Run it in the Supabase SQL editor, then save again."
        : "Failed to save embed configuration. Please try again.",
    };
  }

  revalidatePath(`/spaces/${input.spaceId}/embed`);
  revalidatePath(`/spaces/${input.spaceId}/wall-of-love`);
  revalidatePath(`/embed/${input.spaceId}`);
  revalidatePath(`/wall/${input.spaceId}`);

  return { ok: true, data: { id: data.id } };
}