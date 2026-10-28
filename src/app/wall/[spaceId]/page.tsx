import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWallOfLoveTestimonials } from "@/lib/embed-data";
import { resolveEmbedConfig, type PublicEmbedTestimonialDTO } from "@/lib/validation/embeds";
import PublicEmbedView from "@/components/embeds/public-embed-view";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadSpace(spaceId: string) {
  if (!UUID_RE.test(spaceId)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("spaces")
    .select("id, title, subtitle, collect_rating")
    .eq("id", spaceId)
    .maybeSingle();
  return data ? { admin, space: data } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}): Promise<Metadata> {
  const { spaceId } = await params;
  const loaded = await loadSpace(spaceId);
  return { title: loaded ? `${loaded.space.title} - Wall of Love` : "Wall of Love" };
}

/**
 * Public, shareable Wall of Love. Same data path (getWallOfLoveTestimonials),
 * same config resolver and same renderer as the embed iframe, using the owner's
 * SAVED design, so the page always matches what the Embed Builder produces.
 */
export default async function PublicWallOfLovePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const loaded = await loadSpace(spaceId);
  if (!loaded) notFound();
  const { admin, space } = loaded;

  const { data: savedConfig } = await admin
    .from("embed_configs")
    .select("layout, dark_mode, background_color, animation_enabled, show_rating")
    .eq("space_id", space.id)
    .maybeSingle();

  const config = resolveEmbedConfig(savedConfig, {}, space.collect_rating);

  let testimonials: PublicEmbedTestimonialDTO[] | null = null;
  try {
    testimonials = await getWallOfLoveTestimonials(admin, space.id);
  } catch {
    testimonials = null;
  }

  return (
    <main className="min-h-screen font-sans" style={{ backgroundColor: config.backgroundColor }}>
      <header
        className={`mx-auto max-w-5xl px-4 pt-10 text-center sm:px-6 ${
          config.darkMode ? "text-zinc-100" : "text-zinc-900"
        }`}
      >
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{space.title}</h1>
        <p className="mt-2 text-sm opacity-70">
          {space.subtitle || "What our customers are saying"}
        </p>
      </header>

      <div className="mx-auto max-w-5xl">
        {testimonials === null ? (
          <p
            role="alert"
            className={`p-10 text-center text-sm ${config.darkMode ? "text-zinc-300" : "text-zinc-600"}`}
          >
            Testimonials are temporarily unavailable. Please try again later.
          </p>
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
      </div>
    </main>
  );
}
