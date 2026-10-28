import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import SpaceForm from "@/components/spaces/space-form";
import DeleteSpaceCard from "@/components/spaces/delete-space-card";

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const { supabase, user } = await requireUser();

  // Owner verification: the query is restricted to the authenticated owner.
  const { data: space, error } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", spaceId)
    .eq("owner_id", user.id)
    .single();

  if (error || !space) notFound();

  const { count: testimonialCount } = await supabase
    .from("testimonials")
    .select("id", { count: "exact", head: true })
    .eq("space_id", space.id);

  return (
    <div className="space-y-10">
      <SpaceForm
        isEdit
        initialData={{
          id: space.id,
          title: space.title,
          subtitle: space.subtitle,
          prompt: space.prompt,
          collect_rating: space.collect_rating,
          theme: space.theme,
          field_config: space.field_config,
          slug: space.slug,
        }}
      />
      <DeleteSpaceCard spaceId={space.id} spaceTitle={space.title} testimonialCount={testimonialCount ?? 0} />
    </div>
  );
}
