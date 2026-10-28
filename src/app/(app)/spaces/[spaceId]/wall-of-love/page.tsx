import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ExternalLink, HeartHandshake, Palette } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import TestimonialCard, { type TestimonialItem } from "@/components/testimonials/testimonial-card";
import CopyLinkButton from "@/components/wall/copy-link-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";

export default async function SpaceWallOfLovePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const { supabase, user } = await requireUser();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, title")
    .eq("id", spaceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!space) notFound();

  const { data: wallItems, error } = await supabase
    .from("testimonials")
    .select(
      "id, space_id, name, email, company_name, profile_photo_url, content, rating, share_consent, consent_at, is_favorite, on_wall_of_love, is_hidden, created_at, updated_at"
    )
    .eq("space_id", space.id)
    .eq("on_wall_of_love", true)
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });

  const totalCount = wallItems?.length ?? 0;
  const publicCount = wallItems?.filter((t) => t.share_consent && !t.is_hidden).length ?? 0;
  const withheldCount = totalCount - publicCount;

  const base = `/spaces/${space.id}`;
  const publicPath = `/wall/${space.id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-fg">Wall of Love</h2>
          <p className="text-sm text-muted">
            Heart a testimonial in your inbox to add it here. What you see below is exactly what visitors get.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${base}/embed`} className={buttonClass({ size: "sm" })}>
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
            Customize design
          </Link>
          <Link
            href={publicPath}
            target="_blank"
            rel="noopener"
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open public page
          </Link>
          <CopyLinkButton path={publicPath} label="Copy link" />
        </div>
      </div>

      <section aria-label="Live preview">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            </span>
            <span className="ml-2 truncate text-xs text-muted">Live preview &middot; {publicCount} public</span>
          </div>
          <iframe
            key={`${space.id}-${publicCount}`}
            src={`/embed/${space.id}`}
            title={`Wall of Love preview for ${space.title}`}
            className="block h-[520px] w-full border-0"
          />
        </Card>
      </section>

      {withheldCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-line bg-warn-soft p-4 text-sm text-warn">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>
              {withheldCount} curated testimonial{withheldCount === 1 ? "" : "s"} not shown publicly.
            </strong>{" "}
            A testimonial only appears when the submitter gave sharing consent and it is not hidden.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">
          We could not load your Wall of Love. Please refresh and try again.
        </div>
      )}

      {!error && totalCount === 0 && (
        <EmptyState
          icon={<HeartHandshake className="h-6 w-6" />}
          title="Nothing on this Wall of Love yet"
          description="Open the inbox and tap the heart on the testimonials you want to feature. They show up in the embed and public page automatically."
          action={
            <Link href={`${base}/inbox`} className={buttonClass()}>
              Go to inbox
            </Link>
          }
        />
      )}

      {totalCount > 0 && (
        <section aria-label="Curated testimonials" className="space-y-4">
          <h3 className="text-sm font-semibold text-fg">Curated testimonials ({totalCount})</h3>
          {wallItems?.map((t) => (
            <TestimonialCard key={t.id} item={t as TestimonialItem} />
          ))}
        </section>
      )}
    </div>
  );
}
