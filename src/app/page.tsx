import Link from "next/link";
import {
  BarChart3,
  Check,
  Code2,
  HeartHandshake,
  Inbox,
  Link2,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/nav/sidebar";
import { buttonClass } from "@/components/ui/button";
import { PLAN_LIMITS, PRO_PRICE_USD_PER_MONTH } from "@/lib/plans";
import PublicEmbedView from "@/components/embeds/public-embed-view";
import type { PublicEmbedTestimonialDTO } from "@/lib/validation/embeds";

// Illustrative sample content for the product mockup (not real customers).
const SAMPLE: PublicEmbedTestimonialDTO[] = [
  {
    id: "s1",
    name: "Maya Collins",
    company_name: "Brightside Studio",
    profile_photo_url: null,
    content:
      "We pasted one snippet and our site had real customer stories by lunchtime. Collecting them is finally painless.",
    rating: 5,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "s2",
    name: "Jonas Weber",
    company_name: "Northfield",
    profile_photo_url: null,
    content: "Our customers actually enjoy leaving a review. The form is simple and the consent step builds trust.",
    rating: 5,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "s3",
    name: "Priya Shah",
    company_name: "Lumen Labs",
    profile_photo_url: null,
    content: "Hearting the best ones and embedding the wall took five minutes. It looks great on our pricing page.",
    rating: 4,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const STEPS = [
  { icon: MessageSquareQuote, title: "Create a space", text: "Write the question you want answered and pick the fields you need." },
  { icon: Link2, title: "Share the link", text: "Send your collection page anywhere. Customers need no account." },
  { icon: HeartHandshake, title: "Heart the best", text: "Review your inbox and add favorites to your Wall of Love." },
  { icon: Code2, title: "Embed anywhere", text: "Design the widget and paste one snippet into your site." },
];

const FEATURES = [
  { icon: MessageSquareQuote, title: "Branded collection pages", text: "Custom prompt, optional rating, themes and the form fields you choose." },
  { icon: ShieldCheck, title: "Consent and privacy first", text: "Explicit sharing consent is recorded, and emails are never shown publicly." },
  { icon: Inbox, title: "Inbox and moderation", text: "Search, filter, edit, hide or favorite every testimonial in one place." },
  { icon: HeartHandshake, title: "Wall of Love", text: "Curate your best reviews and show them as a grid or a carousel." },
  { icon: Code2, title: "Embed in minutes", text: "A lightweight script or iframe that resizes itself and respects reduced motion." },
  { icon: BarChart3, title: "Simple analytics", text: "See submissions over time and how many people have responded." },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-fg">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo href="/" />
          <nav aria-label="Main" className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how-it-works" className="hover:text-fg">How it works</a>
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#pricing" className="hover:text-fg">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonClass({ variant: "ghost" })}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonClass()}>
              Start for free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-10 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Testimonials, without the chasing
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Collect, curate and showcase customer love.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            Share one link to gather testimonials, pick your favorites, and put a beautiful Wall of Love on your
            website.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={buttonClass({ size: "lg" })}>
              Start for free
            </Link>
            <Link href="/login" className={buttonClass({ size: "lg", variant: "secondary" })}>
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-faint">Free plan includes {PLAN_LIMITS.free.spaces} spaces. No credit card.</p>

          {/* Product mockup: the real widget renderer with sample data */}
          <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface-2 text-left shadow-pop">
            <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              </span>
              <span className="ml-3 rounded-md bg-surface-2 px-3 py-1 text-xs text-muted">yourbrand.com/love</span>
            </div>
            <PublicEmbedView
              testimonials={SAMPLE}
              layout="masonry"
              darkMode={false}
              backgroundColor="#f4f4f5"
              animationEnabled={false}
              showRating
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-line bg-canvas">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-muted">From first link to live widget in four steps.</p>
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-xl border border-line bg-surface p-6 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-faint">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Everything you need, nothing you do not</h2>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight">Simple pricing</h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-muted">
              Start free. Pro is a demo plan in this version, so nothing is ever charged.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
                <h3 className="font-semibold">Free</h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">$0</span>
                  <span className="text-sm text-muted">/ month</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[`${PLAN_LIMITS.free.spaces} spaces`, `${PLAN_LIMITS.free.testimonialsPerSpace} testimonials per space`, "Wall of Love and embeds"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={buttonClass({ variant: "secondary", className: "mt-7 w-full" })}>
                  Start for free
                </Link>
              </div>

              <div className="rounded-xl border-2 border-accent bg-surface p-7 shadow-card">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Pro</h3>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-ink">
                    Demo
                  </span>
                </div>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">${PRO_PRICE_USD_PER_MONTH}</span>
                  <span className="text-sm text-muted">/ month (illustrative)</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[`${PLAN_LIMITS.pro.spaces} spaces`, `${PLAN_LIMITS.pro.testimonialsPerSpace.toLocaleString()} testimonials per space`, "Everything in Free"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={buttonClass({ className: "mt-7 w-full" })}>
                  Try Pro (demo)
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight">
            Turn happy customers into your best marketing.
          </h2>
          <div className="mt-8 flex justify-center">
            <Link href="/signup" className={buttonClass({ size: "lg" })}>
              Start for free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted sm:flex-row">
          <Logo href="/" />
          <p>&copy; 2026 Testimonial Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
