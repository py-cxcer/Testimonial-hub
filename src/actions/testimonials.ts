"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  editTestimonialSchema,
  type EditTestimonialInput,
} from "@/lib/validation/testimonials";

export type TestimonialActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; issues?: unknown };

export async function toggleFavoriteAction(
  testimonialId: string,
  isFavorite: boolean
): Promise<TestimonialActionResult<{ isFavorite: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Please sign in" };

  const { data, error } = await supabase
    .from("testimonials")
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq("id", testimonialId)
    .select("id, is_favorite")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: "Could not update favorite status. Make sure you own the space.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath("/spaces", "layout");
  revalidatePath("/dashboard");

  return { ok: true, data: { isFavorite: data.is_favorite } };
}

export async function toggleWallOfLoveAction(
  testimonialId: string,
  onWallOfLove: boolean
): Promise<TestimonialActionResult<{ onWallOfLove: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Please sign in" };

  const { data, error } = await supabase
    .from("testimonials")
    .update({
      on_wall_of_love: onWallOfLove,
      updated_at: new Date().toISOString(),
    })
    .eq("id", testimonialId)
    .select("id, on_wall_of_love")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: "Could not update Wall of Love status. Make sure you own the space.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath("/spaces", "layout");
  revalidatePath("/dashboard");

  return { ok: true, data: { onWallOfLove: data.on_wall_of_love } };
}

export async function toggleVisibilityAction(
  testimonialId: string,
  isHidden: boolean
): Promise<TestimonialActionResult<{ isHidden: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Please sign in" };

  const { data, error } = await supabase
    .from("testimonials")
    .update({ is_hidden: isHidden, updated_at: new Date().toISOString() })
    .eq("id", testimonialId)
    .select("id, is_hidden")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: "Could not update visibility. Make sure you own the space.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath("/spaces", "layout");
  revalidatePath("/dashboard");

  return { ok: true, data: { isHidden: data.is_hidden } };
}

export async function editTestimonialAction(
  rawInput: unknown
): Promise<TestimonialActionResult<{ id: string }>> {
  const parsed = editTestimonialSchema.safeParse(rawInput);
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

  const input: EditTestimonialInput = parsed.data;

  // Verify ownership via RLS update
  const updatePayload: Record<string, unknown> = {
    content: input.content,
    updated_at: new Date().toISOString(),
  };

  if (input.rating !== undefined) updatePayload.rating = input.rating;
  if (input.company_name !== undefined) updatePayload.company_name = input.company_name || null;
  if (input.is_hidden !== undefined) updatePayload.is_hidden = input.is_hidden;
  if (input.is_favorite !== undefined) updatePayload.is_favorite = input.is_favorite;
  if (input.on_wall_of_love !== undefined) updatePayload.on_wall_of_love = input.on_wall_of_love;

  const { data, error } = await supabase
    .from("testimonials")
    .update(updatePayload)
    .eq("id", input.id)
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: "Could not update testimonial. Verification failed.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath("/spaces", "layout");
  revalidatePath("/dashboard");

  return { ok: true, data: { id: data.id } };
}

export async function deleteTestimonialAction(
  testimonialId: string
): Promise<TestimonialActionResult<{ deleted: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Please sign in" };

  const { data, error } = await supabase
    .from("testimonials")
    .delete()
    .eq("id", testimonialId)
    .select("id");

  if (error || !data || data.length === 0) {
    return {
      ok: false,
      error: "Could not delete testimonial. It may already be deleted or you do not have permission.",
    };
  }


  revalidatePath("/inbox");
  revalidatePath("/spaces", "layout");
  revalidatePath("/dashboard");

  return { ok: true, data: { deleted: true } };
}
