import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWallOfLoveTestimonials } from "@/lib/embed-data";
import {
  resolveEmbedConfig,
  type EmbedQueryOverrides,
  type PublicEmbedTestimonialDTO,
} from "@/lib/validation/embeds";
import PublicEmbedView from "@/components/embeds/public-embed-view";
import EmbedAutoResize from "@/components/embeds/embed-auto-resize";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<EmbedQueryOverrides>;
}) {
  const { spaceId } = await params;
  const query = await searchParams;

  if (!UUID_RE.test(spaceId)) notFound();

  const adminSupabase = createAdminClient();

  const { data: space } = await adminSupabase
    .from("spaces")
    .select("id, collect_rating")
    .eq("id", spaceId)
    .maybeSingle();

  if (!space) notFound();

  // Saved design from the Embed Builder; the builder preview may override it via the query string.
  const { data: savedConfig } = await adminSupabase
    .from("embed_configs")
    .select("layout, dark_mode, background_color, animation_enabled, show_rating")
    .eq("space_id", space.id)
    .maybeSingle();

  const config = resolveEmbedConfig(savedConfig, query, space.collect_rating);

  let testimonials: PublicEmbedTestimonialDTO[] | null = null;
  try {
    testimonials = await getWallOfLoveTestimonials(adminSupabase, space.id);
  } catch {
    testimonials = null;
  }

  return (
    <div id="th-embed-root">
      {testimonials === null ? (
        <div
          role="alert"
          className="flex min-h-[160px] items-center justify-center p-6 text-center text-xs font-medium text-zinc-600"
          style={{ backgroundColor: config.backgroundColor }}
        >
          Testimonials are temporarily unavailable. Please try again later.
        </div>
      ) : (
        <PublicEmbedView
          testimonials={testimonials}
          layout={config.layout}
          darkMode={config.darkMode}
          backgroundColor={config.backgroundColor}
          animationEnabled={config.animationEnabled}
          showRating={config.showRating}
        />
      )}
      <EmbedAutoResize targetId="th-embed-root" />
    </div>
  );
}
