import Link from "next/link";
import { signupAction } from "@/actions/auth";
import AuthShell from "@/components/auth/auth-shell";
import { buttonClass } from "@/components/ui/button";

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start collecting genuine customer testimonials in minutes. It is free."
      error={error}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={signupAction} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="displayName" className="block text-sm font-medium text-fg">
            Full name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            className={inputClass}
          />
        </div>

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
            Password <span className="font-normal text-muted">(min 6 characters)</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        <button type="submit" className={buttonClass({ size: "lg", className: "w-full" })}>
          Create account
        </button>
      </form>
    </AuthShell>
  );
}
