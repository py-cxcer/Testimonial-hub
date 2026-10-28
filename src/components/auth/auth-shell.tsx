import Link from "next/link";
import { Logo } from "@/components/nav/sidebar";
import { StarRating } from "@/components/ui/star-rating";
import { Avatar } from "@/components/ui/avatar";

/** Split layout used by sign in / sign up: form on the left, a quote panel on the right. */
export default function AuthShell({
  title,
  subtitle,
  error,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  error?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-surface text-fg lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo href="/" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>

          {error && (
            <div role="alert" className="mt-6 rounded-lg bg-danger-soft p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="mt-6">{children}</div>
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </div>
        <p className="text-center text-xs text-faint">
          <Link href="/" className="hover:text-muted">
            Back to home
          </Link>
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-accent lg:flex lg:items-center lg:justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgb(255 255 255 / 0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgb(255 255 255 / 0.2), transparent 45%)",
          }}
        />
        <figure className="relative mx-12 max-w-md rounded-2xl bg-white p-7 text-zinc-900 shadow-pop">
          <StarRating value={5} size={18} />
          <blockquote className="mt-4 text-lg leading-relaxed">
            We pasted one snippet and our site had real customer stories by lunchtime. Collecting them is finally
            painless.
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3">
            <Avatar name="Maya Collins" size={40} />
            <div>
              <p className="text-sm font-semibold">Maya Collins</p>
              <p className="text-xs text-zinc-500">Founder, Brightside Studio</p>
            </div>
          </figcaption>
        </figure>
      </aside>
    </div>
  );
}
