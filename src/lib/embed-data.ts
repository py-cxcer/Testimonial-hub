import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  toPublicEmbedDTO,
  type PublicEmbedTestimonialDTO,
} from "@/lib/validation/embeds";

const PUBLIC_COLUMNS =
  "id, name, company_name, profile_photo_url, content, rating, share_consent, is_hidden, created_at";

/**
 * The ONLY query behind every public Wall of Love surface (embed iframe and the
 * public /wall page). A testimonial is shown only when the owner added it to the
 * Wall of Love AND the submitter consented AND it is not hidden. The filters run in
 * the database query and again in toPublicEmbedDTO(), which also strips the email
 * and all moderation flags.
 */
export async function getWallOfLoveTestimonials(
  admin: SupabaseClient,
  spaceId: string
): Promise<PublicEmbedTestimonialDTO[]> {
  const { data, error } = await admin
    .from("testimonials")
    .select(PUBLIC_COLUMNS)
    .eq("space_id", spaceId)
    .eq("share_consent", true)
    .eq("is_hidden", false)
    .eq("on_wall_of_love", true)
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Wall of Love query failed:", error.code, error.message);
    throw new Error("Could not load the Wall of Love");
  }

  const result: PublicEmbedTestimonialDTO[] = [];
  for (const row of data ?? []) {
    const dto = toPublicEmbedDTO(row as Parameters<typeof toPublicEmbedDTO>[0]);
    if (dto) result.push(dto);
  }
  return result;
}
