"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, HeartHandshake, Inbox, LayoutGrid, Settings } from "lucide-react";
import { cn } from "@/components/ui/cn";

const SUB_LINKS = [
  { suffix: "", label: "Overview", icon: LayoutGrid },
  { suffix: "/inbox", label: "Inbox", icon: Inbox },
  { suffix: "/wall-of-love", label: "Wall of Love", icon: HeartHandshake },
  { suffix: "/embed", label: "Embed widgets", icon: Code2 },
  { suffix: "/settings", label: "Settings", icon: Settings },
];

/** Sidebar list of spaces; the space you are in expands to show its sections. */
export default function SpaceNav({ spaces }: { spaces: { id: string; title: string }[] }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {spaces.slice(0, 10).map((space) => {
        const base = `/spaces/${space.id}`;
        const inSpace = pathname === base || pathname.startsWith(`${base}/`);
        return (
          <li key={space.id}>
            <Link
              href={base}
              aria-current={pathname === base ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                inSpace ? "text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                pathname === base && "bg-accent-soft text-accent-ink"
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-2 text-[10px] font-semibold text-muted">
                {space.title.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="truncate">{space.title}</span>
            </Link>

            {inSpace && (
              <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-line pl-2">
                {SUB_LINKS.filter((l) => l.suffix !== "").map(({ suffix, label, icon: Icon }) => {
                  const href = `${base}${suffix}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={suffix}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                          active
                            ? "bg-accent-soft font-medium text-accent-ink"
                            : "text-muted hover:bg-surface-2 hover:text-fg"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
