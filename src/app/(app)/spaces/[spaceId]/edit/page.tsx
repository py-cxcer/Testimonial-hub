import { redirect } from "next/navigation";

// Legacy URL: space settings now live at /spaces/<id>/settings.
export default async function LegacyEditSpacePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  redirect(`/spaces/${encodeURIComponent(spaceId)}/settings`);
}
