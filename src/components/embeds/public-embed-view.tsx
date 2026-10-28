"use client";

import { useState } from "react";
import type { EmbedLayout, PublicEmbedTestimonialDTO } from "@/lib/validation/embeds";
import { ChevronLeft, ChevronRight, MessageSquareQuote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/components/ui/cn";

interface PublicEmbedViewProps {
  testimonials: PublicEmbedTestimonialDTO[];
  layout: EmbedLayout;
  darkMode: boolean;
  backgroundColor: string;
  animationEnabled: boolean;
  showRating: boolean;
}

/**
 * The single renderer for every public Wall of Love surface (embed iframe and /wall page).
 * Supports five widget types: masonry grid, carousel, marquee, single, and rating badge.
 * Uses explicit light/dark colours (not the app theme) because it renders on third-party sites.
 * Testimonial text is rendered as plain text, never HTML.
 */
export default function PublicEmbedView({
  testimonials,
  layout,
  darkMode,
  backgroundColor,
  animationEnabled,
  showRating,
}: PublicEmbedViewProps) {
  const [index, setIndex] = useState(0);

  const muted = darkMode ? "text-zinc-400" : "text-zinc-500";

  if (testimonials.length === 0) {
    return (
      <div
        className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center font-sans antialiased"
        style={{ backgroundColor }}
      >
        <MessageSquareQuote
          className={cn("mb-3 h-7 w-7", darkMode ? "text-zinc-600" : "text-zinc-300")}
          aria-hidden="true"
        />
        <p className={cn("text-sm font-medium", darkMode ? "text-zinc-300" : "text-zinc-600")}>
          Customer reviews coming soon
        </p>
      </div>
    );
  }

  const card = cn(
    "flex flex-col justify-between rounded-2xl border p-5",
    animationEnabled &&
      "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none",
    darkMode
      ? "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-sm"
      : "border-zinc-200 bg-white text-zinc-900 shadow-sm"
  );

  const renderCard = (t: PublicEmbedTestimonialDTO, size: "sm" | "md" | "lg" = "sm") => (
    <figure className={card}>
      <div className="space-y-3">
        {showRating && t.rating ? <StarRating value={t.rating} size={size === "lg" ? 20 : size === "md" ? 18 : 15} /> : null}
        <blockquote
          className={cn(
            "whitespace-pre-line leading-relaxed",
            size === "lg" ? "text-xl sm:text-2xl" : size === "md" ? "text-base" : "text-sm"
          )}
        >
          {t.content}
        </blockquote>
      </div>
      <figcaption className="mt-5 flex items-center gap-3">
        <Avatar name={t.name} src={t.profile_photo_url} size={size === "lg" ? 44 : 36} />
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold">{t.name}</span>
          {t.company_name && <span className={cn("block truncate text-xs", muted)}>{t.company_name}</span>}
        </div>
      </figcaption>
    </figure>
  );

  const navBtn = cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
    darkMode
      ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
  );

  // ---- Rating badge: compact social-proof summary
  if (layout === "badge") {
    const rated = testimonials.filter((t) => t.rating);
    const average = rated.length ? rated.reduce((sum, t) => sum + (t.rating ?? 0), 0) / rated.length : null;
    return (
      <section
        aria-label="Customer rating summary"
        className="flex min-h-[140px] items-center justify-center p-6 font-sans antialiased"
        style={{ backgroundColor }}
      >
        <div className={cn("flex flex-wrap items-center justify-center gap-5 rounded-2xl border px-6 py-4", darkMode ? "border-zinc-800 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900", "shadow-sm")}>
          <div className="flex -space-x-2" aria-hidden="true">
            {testimonials.slice(0, 4).map((t) => (
              <Avatar key={t.id} name={t.name} src={t.profile_photo_url} size={34} className={cn("ring-2", darkMode ? "ring-zinc-900" : "ring-white")} />
            ))}
          </div>
          <div className="text-center sm:text-left">
            {showRating && average !== null ? (
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <StarRating value={Math.round(average)} size={18} />
                <span className="text-lg font-semibold">{average.toFixed(1)}</span>
              </div>
            ) : null}
            <p className={cn("text-sm", muted)}>
              Loved by <strong className={darkMode ? "text-zinc-100" : "text-zinc-900"}>{testimonials.length}</strong>{" "}
              customer{testimonials.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ---- Single: one featured testimonial (favorites come first)
  if (layout === "single") {
    return (
      <section
        aria-label="Featured testimonial"
        className="flex min-h-full items-center justify-center p-4 font-sans antialiased sm:p-8"
        style={{ backgroundColor }}
      >
        <div className="w-full max-w-2xl">{renderCard(testimonials[0], "lg")}</div>
      </section>
    );
  }

  // ---- Marquee: auto-scrolling strip, paused on hover, static when reduced motion is requested
  if (layout === "marquee") {
    return (
      <section
        aria-label="Customer testimonials"
        className="th-marquee overflow-hidden py-6 font-sans antialiased"
        style={{ backgroundColor }}
      >
        <div className="th-marquee-track px-4">
          {testimonials.map((t) => (
            <div key={t.id} className="w-72 shrink-0 sm:w-80">
              {renderCard(t)}
            </div>
          ))}
          {testimonials.map((t) => (
            <div key={`dup-${t.id}`} className="th-marquee-dup w-72 shrink-0 sm:w-80" aria-hidden="true">
              {renderCard(t)}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ---- Carousel
  if (layout === "carousel") {
    const total = testimonials.length;
    const current = testimonials[Math.min(index, total - 1)];
    const go = (next: number) => setIndex((next + total) % total);

    return (
      <section
        aria-roledescription="carousel"
        aria-label="Customer testimonials"
        className="flex min-h-full flex-col items-center justify-center p-4 font-sans antialiased sm:p-6"
        style={{ backgroundColor }}
      >
        <div className="w-full max-w-xl space-y-4">
          <div aria-live="polite">{renderCard(current, "md")}</div>

          {total > 1 && (
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => go(index - 1)} aria-label="Previous testimonial" className={navBtn}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5" role="group" aria-label="Choose testimonial">
                {testimonials.slice(0, 12).map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show testimonial ${i + 1} of ${total}`}
                    aria-current={i === index}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === index
                        ? cn("w-5", darkMode ? "bg-zinc-200" : "bg-zinc-800")
                        : cn("w-2", darkMode ? "bg-zinc-600" : "bg-zinc-300")
                    )}
                  />
                ))}
              </div>
              <button type="button" onClick={() => go(index + 1)} aria-label="Next testimonial" className={navBtn}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className={cn("text-center text-xs", darkMode ? "text-zinc-500" : "text-zinc-400")}>
            {Math.min(index, total - 1) + 1} of {total}
          </p>
        </div>
      </section>
    );
  }

  // ---- Masonry: CSS columns give a true staggered layout that adapts to the host width.
  return (
    <section
      aria-label="Customer testimonials"
      className="min-h-full p-4 font-sans antialiased sm:p-6"
      style={{ backgroundColor }}
    >
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {testimonials.map((t) => (
          <div key={t.id} className="mb-4 break-inside-avoid">
            {renderCard(t)}
          </div>
        ))}
      </div>
    </section>
  );
}
