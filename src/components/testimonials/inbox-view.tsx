import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Inbox, SearchX } from "lucide-react";
import TestimonialCard, { type TestimonialItem } from "@/components/testimonials/testimonial-card";
import InboxFilters from "@/components/testimonials/inbox-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { getTimeRangeStartDate } from "@/lib/analytics";
import { testimonialFilterSchema } from "@/lib/validation/testimonials";

type RawFilters = Record<string, string | string[] | undefined>;

const COLUMNS =
  "id, space_id, name, email, company_name, profile_photo_url, content, rating, share_consent, consent_at, is_favorite, on_wall_of_love, is_hidden, created_at, updated_at";

/**
 * Inbox for ALL of the owner's spaces (basePath /inbox) or for ONE space
 * (scopeSpaceId + basePath /spaces/<id>/inbox). Authorisation: the query is limited to
 * spaces owned by `userId` and Row Level Security applies on top.
 */
export default async function InboxView({
  supabase,
  userId,
  rawFilters,
  basePath,
  scopeSpaceId,
  showHeader = false,
}: {
  supabase: SupabaseClient;
  userId: string;
  rawFilters: RawFilters;
  basePath: string;
  scopeSpaceId?: string;
  showHeader?: boolean;
}) {
  // Untrusted URL params: fall back to defaults when anything is malformed so a
  // bad value never reaches the database as an invalid uuid/number.
  const parsed = testimonialFilterSchema.safeParse(rawFilters);
  const filters = parsed.success ? parsed.data : testimonialFilterSchema.parse({});

  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, title")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const ownedSpaceIds = (spaces ?? []).map((s) => s.id as string);
  const spaceTitleMap = new Map<string, string>((spaces ?? []).map((s) => [s.id as string, s.title as string]));

  if (ownedSpaceIds.length === 0) {
    return (
      <div className="space-y-6">
        {showHeader && <PageHeader title="All testimonials" description="Everything your customers have sent you." />}
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Create a space to start collecting"
          description="A space is a public page where customers submit testimonials. Create one and share its link."
          action={
            <Link href="/spaces/new" className={buttonClass()}>
              Create a space
            </Link>
          }
        />
      </div>
    );
  }

  const activeSpaceId = scopeSpaceId ?? (filters.spaceId && filters.spaceId !== "all" ? filters.spaceId : undefined);

  let query = supabase
    .from("testimonials")
    .select(COLUMNS, { count: "exact" })
    .in("space_id", ownedSpaceIds);

  if (activeSpaceId) query = query.eq("space_id", activeSpaceId);
  if (filters.rating !== "all") query = query.eq("rating", parseInt(filters.rating, 10));

  const rangeStart = getTimeRangeStartDate(filters.range);
  if (rangeStart) query = query.gte("created_at", rangeStart.toISOString());

  if (filters.visibility === "visible") query = query.eq("is_hidden", false);
  else if (filters.visibility === "hidden") query = query.eq("is_hidden", true);
  if (filters.favorite === "favorites") query = query.eq("is_favorite", true);
  if (filters.wallOfLove === "wall") query = query.eq("on_wall_of_love", true);

  if (filters.search && filters.search.trim() !== "") {
    // Remove characters that could break the PostgREST or() syntax.
    const s = filters.search.trim().replace(/[,()"\\]/g, " ");
    if (s.trim().length > 0) {
      query = query.or(`name.ilike.%${s}%,content.ilike.%${s}%,company_name.ilike.%${s}%`);
    }
  }

  query = query
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });

  const page = filters.page;
  const pageSize = 15;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: testimonials, count, error } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Link builders that keep the other active filters.
  const hrefWith = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(rawFilters)) {
      if (key !== "page" && typeof value === "string" && value) params.set(key, value);
    }
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const activeTab =
    filters.wallOfLove === "wall"
      ? "wall"
      : filters.visibility === "hidden"
        ? "hidden"
        : filters.favorite === "favorites"
          ? "favorites"
          : "all";

  const tabs = [
    { key: "all", label: "All", changes: { wallOfLove: null, visibility: null, favorite: null } },
    { key: "wall", label: "Wall of Love", changes: { wallOfLove: "wall", visibility: null, favorite: null } },
    { key: "favorites", label: "Favorites", changes: { wallOfLove: null, visibility: null, favorite: "favorites" } },
    { key: "hidden", label: "Hidden", changes: { wallOfLove: null, visibility: "hidden", favorite: null } },
  ];

  const hasActiveFilters = Boolean(
    filters.search ||
      (!scopeSpaceId && filters.spaceId && filters.spaceId !== "all") ||
      filters.rating !== "all" ||
      filters.range !== "all" ||
      activeTab !== "all"
  );

  return (
    <div className="space-y-5">
      {showHeader && (
        <PageHeader
          title="All testimonials"
          description={`${totalCount} testimonial${totalCount === 1 ? "" : "s"} across your spaces. Use the heart to add one to a Wall of Love.`}
        />
      )}

      <div role="tablist" aria-label="Filter testimonials" className="no-scrollbar flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            href={hrefWith(tab.changes)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "border-accent text-fg"
                : "border-transparent text-muted hover:border-line-strong hover:text-fg"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <InboxFilters spaces={scopeSpaceId ? [] : (spaces ?? []).map((s) => ({ id: s.id as string, title: s.title as string }))} />

      {error && (
        <div role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">
          We could not load your testimonials. Please refresh and try again.
        </div>
      )}

      {!error && totalCount === 0 && (
        <EmptyState
          icon={hasActiveFilters ? <SearchX className="h-6 w-6" /> : <Inbox className="h-6 w-6" />}
          title={hasActiveFilters ? "No testimonials match your filters" : "No testimonials yet"}
          description={
            hasActiveFilters
              ? "Try a different search or clear a filter."
              : "Share your space link with customers and their testimonials will show up here."
          }
          action={
            hasActiveFilters ? (
              <Link href={basePath} className={buttonClass({ variant: "secondary" })}>
                Clear filters
              </Link>
            ) : undefined
          }
        />
      )}

      <div className="space-y-4">
        {(testimonials ?? []).map((t) => {
          const item: TestimonialItem = {
            ...(t as TestimonialItem),
            space_title: scopeSpaceId ? undefined : spaceTitleMap.get(t.space_id as string),
          };
          return <TestimonialCard key={item.id} item={item} />;
        })}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between border-t border-line pt-4 text-sm text-muted"
        >
          <span>
            Page {page} of {totalPages} ({totalCount} items)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={hrefWith({ page: String(page - 1) })} className={buttonClass({ variant: "secondary", size: "sm" })}>
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={hrefWith({ page: String(page + 1) })} className={buttonClass({ variant: "secondary", size: "sm" })}>
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
