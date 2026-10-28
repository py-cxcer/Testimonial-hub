import Link from "next/link";
import { ArrowRight, FolderKanban, MessageSquare, Plus, Sparkles, Star, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { PLAN_LIMITS, resolvePlan } from "@/lib/plans";
import {
  getTimeRangeStartDate,
  buildDailyTimeline,
  countDistinctSubmitters,
  type TimeRange,
} from "@/lib/analytics";
import CollectionChart from "@/components/dashboard/collection-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { buttonClass } from "@/components/ui/button";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { range: rangeParam } = await searchParams;

  const validRange: TimeRange =
    rangeParam === "7d" || rangeParam === "30d" || rangeParam === "90d" || rangeParam === "all"
      ? rangeParam
      : "30d";

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = resolvePlan(sub);
  const limits = PLAN_LIMITS[plan];

  const { data: spaces, count: spacesCount } = await supabase
    .from("spaces")
    .select("id, title, slug, created_at, testimonials(count)", { count: "exact" })
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const totalSpaces = spacesCount ?? 0;
  const spaceIds = spaces?.map((s) => s.id) ?? [];
  const remainingSpaces = Math.max(0, limits.spaces - totalSpaces);
  const isAtSpaceLimit = totalSpaces >= limits.spaces;

  let totalTestimonials = 0;
  let distinctSubmitters = 0;
  let chartData: { date: string; count: number }[] = [];

  if (spaceIds.length > 0) {
    const { count: testimonialsCount } = await supabase
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .in("space_id", spaceIds);
    totalTestimonials = testimonialsCount ?? 0;

    const { data: emailRows } = await supabase
      .from("testimonials")
      .select("email_normalized")
      .in("space_id", spaceIds);
    distinctSubmitters = countDistinctSubmitters(emailRows?.map((r) => r.email_normalized) ?? []);

    const startDate = getTimeRangeStartDate(validRange);
    let chartQuery = supabase.from("testimonials").select("created_at").in("space_id", spaceIds);
    if (startDate) chartQuery = chartQuery.gte("created_at", startDate.toISOString());
    const { data: timelineRows } = await chartQuery;
    chartData = buildDailyTimeline(timelineRows?.map((r) => r.created_at) ?? [], validRange);
  } else {
    chartData = buildDailyTimeline([], validRange);
  }

  const firstName = (user.user_metadata?.display_name as string | undefined)?.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description="Here is how your testimonial collection is going."
        actions={
          isAtSpaceLimit ? (
            <Link href="/billing" className={buttonClass()}>
              Upgrade to Pro
            </Link>
          ) : (
            <Link href="/spaces/new" className={buttonClass()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New space
            </Link>
          )
        }
      />

      {plan === "free" && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">
                Unlock Pro: {PLAN_LIMITS.pro.spaces} spaces and {PLAN_LIMITS.pro.testimonialsPerSpace.toLocaleString()}{" "}
                testimonials per space
              </p>
              <p className="text-xs text-muted">
                You are on the Free plan ({totalSpaces} / {limits.spaces} spaces used). Pro is a demo plan, no payment.
              </p>
            </div>
          </div>
          <Link href="/billing" className={buttonClass({ size: "sm", className: "shrink-0" })}>
            Upgrade for $9.99/mo
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Spaces"
          value={`${totalSpaces} / ${limits.spaces}`}
          hint={`${remainingSpaces} space${remainingSpaces === 1 ? "" : "s"} remaining`}
          icon={<FolderKanban className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Testimonials"
          value={totalTestimonials}
          hint="Across all spaces"
          icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Distinct submitters"
          value={distinctSubmitters}
          hint="Unique by email"
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Plan"
          value={
            <span className="inline-flex items-center gap-2">
              {plan === "pro" ? "Pro" : "Free"}
              {plan === "pro" && <Badge tone="accent">Demo</Badge>}
            </span>
          }
          hint={plan === "free" ? "Upgrade anytime" : "Pro limits active"}
          icon={<Star className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <CollectionChart data={chartData} currentRange={validRange} />

      <section aria-labelledby="recent-spaces" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-spaces" className="text-sm font-semibold text-fg">
            Your spaces
          </h2>
          <Link href="/spaces" className="inline-flex items-center gap-1 text-xs font-medium text-accent-ink hover:underline">
            View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        {totalSpaces === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title="No spaces yet"
            description="Create a space, share its link, and your first testimonial will show up here."
            action={
              <Link href="/spaces/new" className={buttonClass()}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create your first space
              </Link>
            }
          />
        ) : (
          <Card className="divide-y divide-line">
            {spaces?.slice(0, 5).map((space) => {
              const count = (space.testimonials as { count: number }[] | null)?.[0]?.count ?? 0;
              return (
                <Link
                  key={space.id}
                  href={`/spaces/${space.id}`}
                  className="flex items-center justify-between gap-3 p-4 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-surface-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-semibold text-accent-ink">
                      {space.title.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{space.title}</p>
                      <p className="truncate text-xs text-muted">/s/{space.slug}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {count} testimonial{count === 1 ? "" : "s"}
                  </span>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
