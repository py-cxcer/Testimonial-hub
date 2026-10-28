import Link from "next/link";
import { ExternalLink, FolderKanban, MessageSquare, Plus, Settings, Star, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { PLAN_LIMITS, resolvePlan } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/button";

export default async function SpacesPage() {
  const { supabase, user } = await requireUser();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = resolvePlan(sub);
  const maxSpaces = PLAN_LIMITS[plan].spaces;

  const { data: spaces, error } = await supabase
    .from("spaces")
    .select("id, title, subtitle, slug, theme, collect_rating, created_at, testimonials(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const currentCount = spaces?.length ?? 0;
  const isAtLimit = currentCount >= maxSpaces;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spaces"
        description={`${currentCount} of ${maxSpaces} spaces used on the ${plan === "pro" ? "Pro (demo)" : "Free"} plan.`}
        actions={
          isAtLimit ? (
            <>
              <Badge tone="warn">Plan limit reached</Badge>
              <Link href="/billing" className={buttonClass()}>
                Upgrade to Pro
              </Link>
            </>
          ) : (
            <Link href="/spaces/new" className={buttonClass()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New space
            </Link>
          )
        }
      />

      {error && (
        <div role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">
          We could not load your spaces. Please refresh and try again.
        </div>
      )}

      {!error && currentCount === 0 && (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="Create your first space"
          description="A space is a public page where customers leave testimonials. Share its link and watch them roll in."
          action={
            <Link href="/spaces/new" className={buttonClass()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create a space
            </Link>
          }
        />
      )}

      {currentCount > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces?.map((space) => {
            const count = (space.testimonials as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <Card key={space.id} className="group flex flex-col justify-between transition-shadow hover:shadow-pop">
                <Link href={`/spaces/${space.id}`} className="block space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-base font-semibold text-accent-ink">
                      {space.title.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <Badge tone="neutral" className="capitalize">
                      {space.theme} theme
                    </Badge>
                  </div>
                  <div>
                    <h2 className="truncate text-base font-semibold text-fg group-hover:text-accent-ink">
                      {space.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted">
                      {space.subtitle || "No subtitle"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      {count} testimonial{count === 1 ? "" : "s"}
                    </span>
                    {space.collect_rating && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-star text-star" aria-hidden="true" />
                        Ratings on
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-line px-5 py-3">
                  <Link href={`/spaces/${space.id}/inbox`} className="text-xs font-medium text-accent-ink hover:underline">
                    Open inbox
                  </Link>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/spaces/${space.id}/settings`}
                      aria-label={`Settings for ${space.title}`}
                      title="Settings"
                      className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/spaces/${space.id}/settings#danger-zone`}
                      aria-label={`Delete ${space.title}`}
                      title="Delete space"
                      className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Link>
                    <a
                      href={`/s/${space.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open public page for ${space.title}`}
                      title="Open public page"
                      className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
