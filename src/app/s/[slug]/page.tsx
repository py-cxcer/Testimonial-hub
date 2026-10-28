import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicCollectionForm from "@/components/testimonials/public-collection-form";
import { PLAN_LIMITS, resolvePlan } from "@/lib/plans";
import type { FieldConfig } from "@/lib/validation/spaces";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicSpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Use privileged admin client since anonymous visitors have no direct select privileges
  const adminSupabase = createAdminClient();

  const { data: space, error } = await adminSupabase
    .from("spaces")
    .select("id, owner_id, title, subtitle, prompt, slug, theme, collect_rating, field_config")
    .eq("slug", slug)
    .single();

  if (error || !space) {
    notFound();
  }

  // Check if this space has reached its plan limit
  const { data: sub } = await adminSupabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", space.owner_id)
    .single();

  const plan = resolvePlan(sub);
  const maxTestimonials = PLAN_LIMITS[plan].testimonialsPerSpace;

  const { count: currentTestimonials } = await adminSupabase
    .from("testimonials")
    .select("id", { count: "exact", head: true })
    .eq("space_id", space.id);

  if ((currentTestimonials ?? 0) >= maxTestimonials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-white">Collection Currently Full</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This space has reached its maximum testimonial collection capacity. Thank you for your interest!
          </p>
        </div>
      </div>
    );
  }

  return (
    <PublicCollectionForm
      slug={space.slug}
      title={space.title}
      subtitle={space.subtitle}
      prompt={space.prompt}
      theme={space.theme as "light" | "warm" | "dark"}
      collectRating={space.collect_rating}
      fieldConfig={space.field_config as unknown as FieldConfig}
    />
  );
}
