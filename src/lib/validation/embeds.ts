import { z } from "zod";

/** Allowlist of widget types. The database enum embed_layout must contain the same values. */
export const EMBED_LAYOUTS = ["masonry", "carousel", "marquee", "single", "badge"] as const;

export const embedConfigSchema = z.object({
  spaceId: z.string().uuid("Invalid space ID"),
  layout: z.enum(EMBED_LAYOUTS).default("masonry"),
  darkMode: z.boolean().default(false),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Background color must be a valid 6-character hex code (e.g. #ffffff)")
    .default("#ffffff"),
  animationEnabled: z.boolean().default(false),
  showRating: z.boolean().default(true),
});

export type EmbedConfigInput = z.infer<typeof embedConfigSchema>;

// Strict public DTO structure
export interface PublicEmbedTestimonialDTO {
  id: string;
  name: string;
  company_name: string | null;
  profile_photo_url: string | null;
  content: string;
  rating: number | null;
  created_at: string;
}

export function toPublicEmbedDTO(
  testimonial: {
    id: string;
    name: string;
    email?: string;
    company_name: string | null;
    profile_photo_url: string | null;
    content: string;
    rating: number | null;
    share_consent: boolean;
    is_hidden: boolean;
    created_at: string;
    [key: string]: unknown;
  }
): PublicEmbedTestimonialDTO | null {
  // Non-negotiable: Only consented AND non-hidden testimonials can be public
  if (!testimonial.share_consent || testimonial.is_hidden) {
    return null;
  }

  // Strictly omit email, consent flags, moderation flags, owner IDs, etc.
  return {
    id: testimonial.id,
    name: testimonial.name,
    company_name: testimonial.company_name,
    profile_photo_url: testimonial.profile_photo_url,
    content: testimonial.content,
    rating: testimonial.rating,
    created_at: testimonial.created_at,
  };
}

export type EmbedLayout = (typeof EMBED_LAYOUTS)[number];

function isLayout(value: unknown): value is EmbedLayout {
  return typeof value === "string" && (EMBED_LAYOUTS as readonly string[]).includes(value);
}

export interface SavedEmbedConfig {
  layout: string;
  dark_mode: boolean;
  background_color: string;
  animation_enabled: boolean;
  show_rating: boolean;
}

/** Untrusted `?layout=&dark=&bg=&anim=&rating=` overrides used by the builder preview. */
export interface EmbedQueryOverrides {
  layout?: string;
  dark?: string;
  bg?: string;
  anim?: string;
  rating?: string;
}

export interface ResolvedEmbedConfig {
  layout: EmbedLayout;
  darkMode: boolean;
  backgroundColor: string;
  animationEnabled: boolean;
  showRating: boolean;
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Single place that turns saved settings (+ optional untrusted query overrides)
 * into a safe render config. Used by the embed iframe, the public Wall of Love
 * page and anything else that renders the widget, so they can never diverge.
 * Every value is allowlisted/validated; nothing user-supplied is rendered as HTML.
 */
export function resolveEmbedConfig(
  saved: SavedEmbedConfig | null | undefined,
  query: EmbedQueryOverrides = {},
  spaceCollectsRating = true
): ResolvedEmbedConfig {
  const savedLayout: EmbedLayout = isLayout(saved?.layout) ? saved.layout : "masonry";
  const layout: EmbedLayout =
    isLayout(query.layout) ? query.layout : savedLayout;

  const darkMode = query.dark !== undefined ? query.dark === "true" : saved?.dark_mode ?? false;

  const defaultBg = darkMode ? "#18181b" : "#ffffff";
  const rawBg = query.bg ?? saved?.background_color ?? defaultBg;
  const backgroundColor = HEX_COLOR.test(rawBg) ? rawBg : defaultBg;

  const animationEnabled =
    query.anim !== undefined ? query.anim === "true" : saved?.animation_enabled ?? false;

  const wantsRating = query.rating !== undefined ? query.rating === "true" : saved?.show_rating ?? true;

  return {
    layout,
    darkMode,
    backgroundColor,
    animationEnabled,
    showRating: wantsRating && spaceCollectsRating,
  };
}
