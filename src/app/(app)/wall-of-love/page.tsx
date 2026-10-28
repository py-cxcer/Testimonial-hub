import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Legacy URL: the Wall of Love now lives inside each space.
export default async function LegacyWallOfLovePage({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { spaceId } = await searchParams;

  const { data: spaces } = await supabase
    .from("spaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const owned = spaces ?? [];
  const target =
    (spaceId && UUID_RE.test(spaceId) ? owned.find((s) => s.id === spaceId) : undefined) ?? owned[0];

  redirect(target ? `/spaces/${target.id}/wall-of-love` : "/spaces");
}
