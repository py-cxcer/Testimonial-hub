import { requireUser } from "@/lib/auth/require-user";
import InboxView from "@/components/testimonials/inbox-view";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, user } = await requireUser();
  const rawFilters = await searchParams;

  return (
    <InboxView
      supabase={supabase}
      userId={user.id}
      rawFilters={rawFilters}
      basePath="/inbox"
      showHeader
    />
  );
}
