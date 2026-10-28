"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createSpaceSchema,
  updateSpaceSchema,
} from "@/lib/validation/spaces";
import { PLAN_LIMITS, resolvePlan } from "@/lib/plans";
import { makeSlug } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROFILE_PHOTO_BUCKET } from "@/lib/validation/photos";

export type SpaceActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; issues?: unknown };

export async function createSpaceAction(
  rawInput: unknown
): Promise<SpaceActionResult<{ spaceId: string; slug: string; publicUrl: string }>> {
  const parsed = createSpaceSchema.safeParse(rawInput);
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

  if (!user) {
    return { ok: false, error: "Please sign in to create a space" };
  }

  // 1. Verify user subscription & plan limits
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .single();

  const plan = resolvePlan(sub);

  // 2. Enforce limits server-side
  const { count, error: countError } = await supabase
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) {
    return { ok: false, error: "Could not verify your current space usage" };
  }

  if ((count ?? 0) >= PLAN_LIMITS[plan].spaces) {
    return {
      ok: false,
      error: `Space limit reached (${PLAN_LIMITS[plan].spaces} spaces for ${plan.toUpperCase()} plan). Upgrade to Pro to create up to 25 spaces.`,
    };
  }

  const input = parsed.data;

  // 3. Attempt insert with slug collision retry (up to 3 tries)
  let insertSuccess = false;
  let createdData: { id: string; slug: string } | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = makeSlug(input.title);
    const { data, error } = await supabase
      .from("spaces")
      .insert({
        owner_id: user.id,
        title: input.title,
        subtitle: input.subtitle || null,
        prompt: input.prompt,
        slug,
        collect_rating: input.collectRating,
        theme: input.theme,
        field_config: input.fieldConfig,
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      insertSuccess = true;
      createdData = data;
      break;
    }

    // If it's a unique constraint violation on slug, retry with new random UUID suffix
    if (error && error.code === "23505" && error.message.includes("slug")) {
      continue;
    } else if (error) {
      // The DB trigger is the authoritative, race-free limit check; the count
      // above is only a fast path for a friendlier message.
      if (error.message.includes("SPACE_LIMIT_REACHED")) {
        lastError = `Space limit reached (${PLAN_LIMITS[plan].spaces} spaces for ${plan.toUpperCase()} plan). Upgrade to Pro to create up to ${PLAN_LIMITS.pro.spaces} spaces.`;
      } else {
        console.error("Space insert failed:", error.code, error.message);
        lastError = "Could not create space. Please try again.";
      }
      break;
    }
  }

  if (!insertSuccess || !createdData) {
    return {
      ok: false,
      error: lastError || "Could not create space. Please try again.",
    };
  }

  revalidatePath("/spaces");
  revalidatePath("/dashboard");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    ok: true,
    data: {
      spaceId: createdData.id,
      slug: createdData.slug,
      publicUrl: `${appUrl}/s/${createdData.slug}`,
    },
  };
}

export async function updateSpaceAction(
  rawInput: unknown
): Promise<SpaceActionResult<{ spaceId: string }>> {
  const parsed = updateSpaceSchema.safeParse(rawInput);
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

  if (!user) {
    return { ok: false, error: "Please sign in" };
  }

  const input = parsed.data;

  // Owner verification enforced via RLS and explicit query check
  const { data, error } = await supabase
    .from("spaces")
    .update({
      title: input.title,
      subtitle: input.subtitle || null,
      prompt: input.prompt,
      collect_rating: input.collectRating,
      theme: input.theme,
      field_config: input.fieldConfig,
    })
    .eq("id", input.id)
    .eq("owner_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: "Could not update space. Make sure you own this space.",
    };
  }

  revalidatePath("/spaces");
  revalidatePath(`/spaces/${input.id}`);
  revalidatePath("/dashboard");

  return { ok: true, data: { spaceId: data.id } };
}

export async function deleteSpaceAction(
  spaceId: string
): Promise<SpaceActionResult<{ deleted: boolean }>> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(spaceId)) {
    return { ok: false, error: "Invalid space" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in" };
  }

  // Ownership is enforced twice: the explicit owner filter and Row Level Security.
  // Testimonials and the embed design are removed by ON DELETE CASCADE.
  const { data: deletedRows, error } = await supabase
    .from("spaces")
    .delete()
    .eq("id", spaceId)
    .eq("owner_id", user.id)
    .select("id");

  if (error) {
    console.error("Space delete failed:", error.code, error.message);
    return { ok: false, error: "Could not delete the space. Please try again." };
  }

  if (!deletedRows || deletedRows.length === 0) {
    return { ok: false, error: "This space no longer exists or you do not have access to it." };
  }

  await removeSpacePhotos(spaceId);

  revalidatePath("/", "layout");

  return { ok: true, data: { deleted: true } };
}

/**
 * Best-effort removal of the profile photos uploaded for a deleted space. The space is
 * already gone, so a failure here only leaves orphaned files and must not fail the request.
 */
async function removeSpacePhotos(spaceId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const bucket = admin.storage.from(PROFILE_PHOTO_BUCKET);
    const { data: files } = await bucket.list(spaceId, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${spaceId}/${f.name}`);
    if (paths.length > 0) await bucket.remove(paths);
  } catch (err) {
    console.error("Space photo cleanup failed:", err instanceof Error ? err.message : err);
  }
}
