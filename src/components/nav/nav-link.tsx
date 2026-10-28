"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

/** Link that highlights itself when the current URL matches. */
export default function NavLink({
  href,
  exact = false,
  variant = "sidebar",
  className,
  children,
  onNavigate,
}: {
  href: string;
  exact?: boolean;
  variant?: "sidebar" | "tab";
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const styles =
    variant === "tab"
      ? cn(
          "-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 pt-2 text-sm font-medium transition-colors",
          active
            ? "border-accent text-fg"
            : "border-transparent text-muted hover:border-line-strong hover:text-fg"
        )
      : cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-fg"
        );

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(styles, className)}
    >
      {children}
    </Link>
  );
}
