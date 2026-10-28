import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import EmbedBuilder from "@/components/embeds/embed-builder";

export default async function SpaceEmbedPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const { supabase, user } = await requireUser();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, title")
    .eq("id", spaceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!space) notFound();

  const { data: embedConfig } = await supabase
    .from("embed_configs")
    .select("layout, dark_mode, background_color, animation_enabled, show_rating")
    .eq("space_id", space.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  // How many curated testimonials are actually public (on the Wall + consented + visible).
  const { count: wallCount } = await supabase
    .from("testimonials")
    .select("id", { count: "exact", head: true })
    .eq("space_id", space.id)
    .eq("on_wall_of_love", true)
    .eq("share_consent", true)
    .eq("is_hidden", false);

  return (
    <EmbedBuilder
      spaceId={space.id}
      spaceTitle={space.title}
      wallCount={wallCount ?? 0}
      initialConfig={embedConfig ?? undefined}
    />
  );
}
