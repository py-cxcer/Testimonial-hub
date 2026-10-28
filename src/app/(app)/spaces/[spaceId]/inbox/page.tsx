import { requireUser } from "@/lib/auth/require-user";
import InboxView from "@/components/testimonials/inbox-view";

export default async function SpaceInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { spaceId } = await params;
  const { supabase, user } = await requireUser();
  const rawFilters = await searchParams;

  // The layout already verified ownership; the view re-scopes every query to this owner.
  return (
    <InboxView
      supabase={supabase}
      userId={user.id}
      rawFilters={rawFilters}
      basePath={`/spaces/${spaceId}/inbox`}
      scopeSpaceId={spaceId}
    />
  );
}
