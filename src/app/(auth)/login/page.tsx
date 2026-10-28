import Link from "next/link";
import { loginAction } from "@/actions/auth";
import AuthShell from "@/components/auth/auth-shell";
import { buttonClass } from "@/components/ui/button";

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your spaces and testimonials."
      error={error}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-accent-ink hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form action={loginAction} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-fg">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-fg">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        <button type="submit" className={buttonClass({ size: "lg", className: "w-full" })}>
          Sign in
        </button>
      </form>
    </AuthShell>
  );
}
