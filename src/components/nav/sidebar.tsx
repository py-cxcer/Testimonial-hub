import Link from "next/link";
import { Home, Inbox, CreditCard, Plus, LogOut, MessageSquareQuote, Layers } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import ThemeToggle from "@/components/theme-toggle";
import NavLink from "@/components/nav/nav-link";
import SpaceNav from "@/components/nav/space-nav";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";

export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-semibold tracking-tight text-fg">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-card">
        <MessageSquareQuote className="h-4 w-4" aria-hidden="true" />
      </span>
      Testimonial Hub
    </Link>
  );
}

/** Shared by the desktop sidebar and the mobile drawer. */
export default function SidebarContent({
  email,
  plan,
  spaces,
}: {
  email: string;
  plan: Plan;
  spaces: { id: string; title: string }[];
}) {
  const limit = PLAN_LIMITS[plan].spaces;
  const used = spaces.length;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <Logo />
      </div>

      <nav aria-label="Workspace" className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">
          <NavLink href="/dashboard" exact>
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </NavLink>
          <NavLink href="/inbox" exact>
            <Inbox className="h-4 w-4" aria-hidden="true" />
            All testimonials
          </NavLink>
          <NavLink href="/billing">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            Billing
          </NavLink>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Spaces</span>
            <Link
              href="/spaces/new"
              aria-label="Create a space"
              title="Create a space"
              className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-0.5">
            {spaces.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No spaces yet.</p>
            ) : (
              <SpaceNav spaces={spaces} />
            )}
            <NavLink href="/spaces" exact className="text-xs">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              All spaces
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="space-y-3 border-t border-line p-3">
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="flex items-center justify-between">
            <Badge tone={plan === "pro" ? "accent" : "neutral"}>
              {plan === "pro" ? "Pro (demo)" : "Free plan"}
            </Badge>
            <span className="text-xs text-muted">
              {used} / {limit} spaces
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Spaces used"
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={Math.min(used, limit)}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          {plan === "free" && (
            <Link href="/billing" className={buttonClass({ size: "sm", className: "mt-3 w-full" })}>
              Upgrade to Pro
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-[11px] text-faint">Signed in as</p>
            <p className="truncate text-xs font-medium text-fg">{email}</p>
          </div>
          <div className="flex items-center">
            <ThemeToggle />
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
