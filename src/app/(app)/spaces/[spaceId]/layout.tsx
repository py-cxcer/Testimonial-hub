import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, LayoutGrid, Inbox, HeartHandshake, Code2, Settings } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import NavLink from "@/components/nav/nav-link";
import CopyLinkButton from "@/components/wall/copy-link-button";
import { buttonClass } from "@/components/ui/button";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Second level of the space-centric navigation: everything about ONE space
 * (overview, inbox, wall of love, embed, settings) lives under /spaces/<id>.
 */
export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  if (!UUID_RE.test(spaceId)) notFound();

  const { supabase, user } = await requireUser();
  const { data: space } = await supabase
    .from("spaces")
    .select("id, title, slug")
    .eq("id", spaceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!space) notFound();

  const base = `/spaces/${space.id}`;
  const publicPath = `/s/${space.slug}`;

  const tabs = [
    { href: base, label: "Overview", icon: LayoutGrid, exact: true },
    { href: `${base}/inbox`, label: "Inbox", icon: Inbox },
    { href: `${base}/wall-of-love`, label: "Wall of Love", icon: HeartHandshake },
    { href: `${base}/embed`, label: "Embed widgets", icon: Code2 },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted">
          <Link href="/spaces" className="hover:text-fg">
            Spaces
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="truncate text-fg">{space.title}</span>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-fg">{space.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <CopyLinkButton path={publicPath} label="Copy collection link" />
            <Link
              href={publicPath}
              target="_blank"
              rel="noopener"
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View page
            </Link>
          </div>
        </div>
      </div>

      <nav aria-label="Space" className="no-scrollbar -mx-1 flex gap-5 overflow-x-auto overflow-y-hidden border-b border-line px-1">
        {tabs.map(({ href, label, icon: Icon, exact }) => (
          <NavLink key={href} href={href} exact={exact} variant="tab">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  );
}
