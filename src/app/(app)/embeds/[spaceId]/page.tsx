import { redirect } from "next/navigation";

// Legacy URL: the embed designer now lives at /spaces/<id>/embed.
export default async function LegacyEmbedBuilderPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  redirect(`/spaces/${encodeURIComponent(spaceId)}/embed`);
}
