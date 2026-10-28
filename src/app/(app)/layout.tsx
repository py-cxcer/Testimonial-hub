import { requireUser } from "@/lib/auth/require-user";
import { resolvePlan } from "@/lib/plans";
import SidebarContent, { Logo } from "@/components/nav/sidebar";
import MobileNav from "@/components/nav/mobile-nav";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();

  const [{ data: sub }, { data: spaces }] = await Promise.all([
    supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("spaces")
      .select("id, title")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const sidebar = (
    <SidebarContent email={user.email ?? ""} plan={resolvePlan(sub)} spaces={spaces ?? []} />
  );

  return (
    <div className="min-h-screen bg-canvas text-fg lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      <div className="min-w-0 flex-1">
        <MobileNav logo={<Logo />}>{sidebar}</MobileNav>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
