import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import SpaceForm from "@/components/spaces/space-form";
import { PLAN_LIMITS, resolvePlan } from "@/lib/plans";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";

export default async function NewSpacePage() {
  const { supabase, user } = await requireUser();

  // Server-side check before rendering the form (the database trigger is the final guard).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = resolvePlan(sub);
  const maxSpaces = PLAN_LIMITS[plan].spaces;

  const { count } = await supabase
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= maxSpaces) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          title="Space Limit Reached"
          description={`You are using ${count} of ${maxSpaces} spaces available on the ${plan.toUpperCase()} plan. Upgrade to Pro to create up to ${PLAN_LIMITS.pro.spaces} spaces.`}
          action={
            <div className="flex justify-center gap-3">
              <Link href="/spaces" className={buttonClass({ variant: "secondary" })}>
                Back to Spaces
              </Link>
              <Link href="/billing" className={buttonClass()}>
                Upgrade Plan
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return <SpaceForm />;
}
