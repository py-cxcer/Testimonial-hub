import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, FlaskConical } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { PLAN_LIMITS, PRO_PRICE_USD_PER_MONTH, resolvePlan } from "@/lib/plans";
import { confirmDemoUpgradeAction } from "@/actions/billing";
import SubmitButton from "@/components/billing/submit-button";
import { Card, CardBody } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

export default async function DemoUpgradePage() {
  const { supabase, user } = await requireUser();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (resolvePlan(sub) === "pro") {
    redirect("/billing");
  }

  const features = [
    `Up to ${PLAN_LIMITS.pro.spaces} spaces (Free: ${PLAN_LIMITS.free.spaces})`,
    `${PLAN_LIMITS.pro.testimonialsPerSpace.toLocaleString()} testimonials per space (Free: ${PLAN_LIMITS.free.testimonialsPerSpace})`,
    "Everything in Free",
  ];

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-2.5 rounded-lg bg-accent-soft p-3 text-xs text-accent-ink">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>This is a demo checkout.</strong> No payment details are requested and no money is charged.
              Confirming only switches your account to the simulated Pro plan.
            </span>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-fg">Confirm upgrade to Pro</h1>
            <p className="mt-1 text-sm text-muted">Review the plan you are about to switch to.</p>
          </div>

          <div className="rounded-xl border border-line p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-fg">Pro plan</span>
              <span className="text-fg">
                <span className="text-2xl font-semibold">${PRO_PRICE_USD_PER_MONTH}</span>
                <span className="text-xs text-muted"> / month</span>
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-fg">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
              Due today (demo): <strong className="text-fg">$0.00</strong>. The price shown is illustrative only.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href="/billing?notice=canceled" className={buttonClass({ variant: "secondary" })}>
              Cancel
            </Link>
            <form action={confirmDemoUpgradeAction}>
              <SubmitButton pendingLabel="Upgrading...">Confirm demo upgrade</SubmitButton>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
