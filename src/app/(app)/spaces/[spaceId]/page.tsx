import Link from "next/link";
import { notFound } from "next/navigation";
import { Code2, HeartHandshake, Inbox, MessageSquare, Star, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getTimeRangeStartDate } from "@/lib/analytics";
import CopyLinkButton from "@/components/wall/copy-link-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { buttonClass } from "@/components/ui/button";

export default async function SpaceOverviewPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const { supabase, user } = await requireUser();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, title, subtitle, prompt, slug, theme, collect_rating, created_at")
    .eq("id", spaceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!space) notFound();

  const weekStart = getTimeRangeStartDate("7d");
  const [total, onWall, lastWeek, ratings] = await Promise.all([
    supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("space_id", space.id),
    supabase
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .eq("space_id", space.id)
      .eq("on_wall_of_love", true),
    supabase
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .eq("space_id", space.id)
      .gte("created_at", weekStart ? weekStart.toISOString() : new Date(0).toISOString()),
    space.collect_rating
      ? supabase.from("testimonials").select("rating").eq("space_id", space.id).not("rating", "is", null)
      : Promise.resolve({ data: [] as { rating: number }[] }),
  ]);

  const ratingValues = (ratings.data ?? []).map((r) => r.rating as number);
  const average =
    ratingValues.length > 0 ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1) : null;

  const base = `/spaces/${space.id}`;
  const publicPath = `/s/${space.slug}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Testimonials"
          value={total.count ?? 0}
          hint="Collected in this space"
          icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="On Wall of Love"
          value={onWall.count ?? 0}
          hint="Hearted by you"
          icon={<HeartHandshake className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Last 7 days"
          value={lastWeek.count ?? 0}
          hint="New submissions"
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Average rating"
          value={space.collect_rating ? (average ?? "—") : "Off"}
          hint={space.collect_rating ? `${ratingValues.length} rated` : "Ratings are disabled"}
          icon={<Star className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-fg">Share your collection page</h2>
            <p className="mt-0.5 text-xs text-muted">
              Send this link to customers. They can submit a testimonial without creating an account.
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-fg">
                {publicPath}
              </code>
              <CopyLinkButton path={publicPath} label="Copy link" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">The question you ask</p>
              <p className="mt-1 rounded-lg border border-line bg-surface-2 p-3 text-sm text-fg">
                &ldquo;{space.prompt}&rdquo;
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-fg">Next steps</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <Link href={`${base}/inbox`} className={buttonClass({ variant: "secondary", className: "w-full justify-start" })}>
              <Inbox className="h-4 w-4" aria-hidden="true" />
              Review your inbox
            </Link>
            <Link
              href={`${base}/wall-of-love`}
              className={buttonClass({ variant: "secondary", className: "w-full justify-start" })}
            >
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              Curate the Wall of Love
            </Link>
            <Link href={`${base}/embed`} className={buttonClass({ variant: "secondary", className: "w-full justify-start" })}>
              <Code2 className="h-4 w-4" aria-hidden="true" />
              Embed widgets
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
