"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";

interface InboxFiltersProps {
  /** Pass an empty list to hide the space filter (e.g. inside a single space). */
  spaces: { id: string; title: string }[];
}

const selectClass =
  "h-9 rounded-lg border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export default function InboxFilters({ spaces }: InboxFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentSpace = searchParams.get("spaceId") || "all";
  const currentRating = searchParams.get("rating") || "all";
  const currentRange = searchParams.get("range") || "all";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page"); // Reset pagination on filter change
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 flex-1 sm:min-w-64">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search testimonials"
          placeholder="Search by name, company or text"
          defaultValue={currentSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => {
            if (e.target.value !== currentSearch) updateParam("search", e.target.value);
          }}
          className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {spaces.length > 0 && (
        <select
          aria-label="Filter by space"
          value={currentSpace}
          onChange={(e) => updateParam("spaceId", e.target.value)}
          className={selectClass}
        >
          <option value="all">All spaces</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      )}

      <select
        aria-label="Filter by rating"
        value={currentRating}
        onChange={(e) => updateParam("rating", e.target.value)}
        className={selectClass}
      >
        <option value="all">Any rating</option>
        <option value="5">5 stars</option>
        <option value="4">4 stars</option>
        <option value="3">3 stars</option>
        <option value="2">2 stars</option>
        <option value="1">1 star</option>
      </select>

      <select
        aria-label="Filter by date"
        value={currentRange}
        onChange={(e) => updateParam("range", e.target.value)}
        className={selectClass}
      >
        <option value="all">Any date</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>
    </div>
  );
}
