import Link from "next/link";
import { AlertCircle, Check, CheckCircle2, FlaskConical, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { PLAN_LIMITS, PRO_PRICE_USD_PER_MONTH, resolvePlan } from "@/lib/plans";
import { switchToFreePlanAction } from "@/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/components/ui/cn";

const NOTICES = {
  upgraded: {
    tone: "success",
    text: "Demo upgrade complete. Your account is now on the simulated Pro plan and the higher limits are active. No payment was taken.",
  },
  downgraded: {
    tone: "info",
    text: "You are back on the Free plan. Your existing spaces and testimonials were kept; Free limits now apply to new ones.",
  },
  canceled: {
    tone: "info",
    text: "Upgrade canceled. Your plan was not changed.",
  },
  error: {
    tone: "error",
    text: "We could not update your demo plan. Please try again.",
  },
} as const;

const TONE_CLASSES = {
  success: "bg-success-soft text-success",
  info: "bg-warn-soft text-warn",
  error: "bg-danger-soft text-danger",
} as const;

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(used, max)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div className={cn("h-full rounded-full", used >= max ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { notice: noticeKey } = await searchParams;
  const notice =
    noticeKey && Object.hasOwn(NOTICES, noticeKey) ? NOTICES[noticeKey as keyof typeof NOTICES] : null;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, billing_mode, demo_upgraded_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = resolvePlan(sub);
  const limits = PLAN_LIMITS[plan];

  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, title, testimonials(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const spaceRows = (spaces ?? []).map((s) => ({
    id: s.id as string,
    title: s.title as string,
    count: (s.testimonials as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
  const totalSpaces = spaceRows.length;
  const overSpaceLimit = totalSpaces > limits.spaces;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Billing & Plans" description="Compare plans and review your usage." />

      <div className="flex items-start gap-3 rounded-xl bg-accent-soft p-4 text-sm text-accent-ink">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Demo billing.</strong> This app does not use a payment gateway. Upgrading only switches a plan flag
          on your account so you can try the Pro limits. No card is collected and nothing is charged.
        </span>
      </div>

      {notice && (
        <div role="status" className={cn("flex items-center gap-2.5 rounded-xl p-4 text-sm", TONE_CLASSES[notice.tone])}>
          {notice.tone === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <Card>
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted">Current plan</p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-semibold capitalize text-fg">{plan}</h2>
                {plan === "pro" ? <Badge tone="accent">Pro (demo subscription)</Badge> : <Badge>Free</Badge>}
              </div>
              {plan === "pro" && sub?.demo_upgraded_at && (
                <p className="mt-1 text-xs text-muted">
                  Demo upgrade activated {new Date(sub.demo_upgraded_at).toLocaleDateString()}. Simulated only; no
                  renewal or charge.
                </p>
              )}
            </div>

            {plan === "free" ? (
              <Link href="/billing/upgrade" className={buttonClass()}>
                <Zap className="h-4 w-4" aria-hidden="true" />
                Upgrade to Pro
              </Link>
            ) : (
              <form action={switchToFreePlanAction}>
                <Button type="submit" variant="secondary">
                  Switch back to Free (reset demo)
                </Button>
              </form>
            )}
          </div>

          <div className="space-y-4 border-t border-line pt-5">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted">
                <span>Spaces</span>
                <span className="font-semibold text-fg">
                  {totalSpaces} / {limits.spaces}
                </span>
              </div>
              <UsageBar used={totalSpaces} max={limits.spaces} label="Spaces used" />
              {overSpaceLimit && (
                <p className="text-xs text-warn">
                  You have more spaces than the Free plan allows. They are all kept, but you cannot create new ones
                  until you are under the limit.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted">
                Testimonials per space (limit {limits.testimonialsPerSpace.toLocaleString()})
              </p>
              {spaceRows.length === 0 ? (
                <p className="text-xs text-muted">
                  No spaces yet.{" "}
                  <Link href="/spaces/new" className="font-medium text-accent-ink hover:underline">
                    Create your first space
                  </Link>
                  .
                </p>
              ) : (
                spaceRows.map((s) => (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="truncate pr-2 text-fg">{s.title}</span>
                      <span className="shrink-0 font-semibold text-fg">
                        {s.count} / {limits.testimonialsPerSpace.toLocaleString()}
                      </span>
                    </div>
                    <UsageBar used={s.count} max={limits.testimonialsPerSpace} label={`${s.title} testimonials used`} />
                  </div>
                ))
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className={cn("flex flex-col justify-between", plan === "free" && "ring-2 ring-accent/30")}>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-fg">Free</h3>
              {plan === "free" && <Badge tone="accent">Current</Badge>}
            </div>
            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-fg">$0</span>
              <span className="text-xs text-muted">/ month</span>
            </p>
            <ul className="space-y-2.5 text-sm text-fg">
              {[
                `Up to ${PLAN_LIMITS.free.spaces} spaces`,
                `${PLAN_LIMITS.free.testimonialsPerSpace} testimonials per space`,
                "Themes and optional rating",
                "Embeddable Wall of Love widgets",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </CardBody>
          <div className="p-5 pt-0">
            {plan === "free" ? (
              <div className="rounded-lg border border-line bg-surface-2 py-2 text-center text-sm font-medium text-muted">
                Active plan
              </div>
            ) : (
              <form action={switchToFreePlanAction}>
                <Button type="submit" variant="secondary" className="w-full">
                  Switch to Free (demo)
                </Button>
              </form>
            )}
          </div>
        </Card>

        <Card className={cn("relative flex flex-col justify-between", plan === "pro" && "ring-2 ring-accent/40")}>
          <span className="absolute right-4 top-4 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-ink">
            Demo
          </span>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-fg">Pro</h3>
              {plan === "pro" && <Badge tone="accent">Current</Badge>}
            </div>
            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-fg">${PRO_PRICE_USD_PER_MONTH}</span>
              <span className="text-xs text-muted">/ month (illustrative)</span>
            </p>
            <ul className="space-y-2.5 text-sm text-fg">
              {[
                `Up to ${PLAN_LIMITS.pro.spaces} spaces`,
                `${PLAN_LIMITS.pro.testimonialsPerSpace.toLocaleString()} testimonials per space`,
                "Everything in Free",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </CardBody>
          <div className="p-5 pt-0">
            {plan === "pro" ? (
              <div className="rounded-lg bg-accent-soft py-2 text-center text-sm font-medium text-accent-ink">
                Active plan (demo)
              </div>
            ) : (
              <Link href="/billing/upgrade" className={buttonClass({ className: "w-full" })}>
                Upgrade to Pro
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
