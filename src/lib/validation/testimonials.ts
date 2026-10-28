import { z } from "zod";

export const publicSubmissionBaseSchema = z.object({
  slug: z.string().min(3).max(80).regex(/^[a-z0-9][a-z0-9-]+$/),
  name: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().max(320).optional().default(""),
  company_name: z.string().trim().max(120).optional().default(""),
  social_links: z.record(z.string(), z.string().trim().max(500)).optional().default({}),
  // Only http(s) URLs: rejects javascript:, data: and other schemes.
  profile_photo_url: z
    .string()
    .url()
    .max(1000)
    .refine((v) => /^https?:\/\//i.test(v), "Photo URL must start with http:// or https://")
    .optional()
    .or(z.literal("")),
  content: z
    .string()
    .trim()
    .min(10, "Testimonial must be at least 10 characters")
    .max(5000, "Testimonial cannot exceed 5000 characters"),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  share_consent: z.boolean().default(false),
  website: z.string().max(500).optional(), // Honeypot: real users leave it empty; the route silently drops non-empty values
});

export type PublicSubmissionInput = z.infer<typeof publicSubmissionBaseSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateAgainstSpaceConfig(
  input: PublicSubmissionInput,
  config: {
    collect_rating: boolean;
    field_config: Record<string, { enabled: boolean; required: boolean }>;
  }
) {
  const errors: Record<string, string> = {};
  const fields = config.field_config;

  for (const key of ["name", "email", "company_name", "social_links", "profile_photo"]) {
    const setting = fields[key];
    if (!setting?.enabled) continue;

    if (key === "profile_photo") {
      if (setting.required && (!input.profile_photo_url || input.profile_photo_url.trim() === "")) {
        errors.profile_photo = "Profile photo is required";
      }
      continue;
    }

    const value = input[key as keyof PublicSubmissionInput];
    const empty =
      value === undefined ||
      value === null ||
      value === "" ||
      (typeof value === "object" && value !== null && Object.keys(value).length === 0);

    if (setting.required && empty) {
      errors[key] = "This field is required";
    }
  }

  if (fields.email?.enabled && input.email) {
    const emailResult = z.string().email().safeParse(input.email);
    if (!emailResult.success) {
      errors.email = "Enter a valid email address";
    }
  }

  if (!config.collect_rating && input.rating != null) {
    errors.rating = "This space does not collect ratings";
  }

  if (config.collect_rating && input.rating != null && (input.rating < 1 || input.rating > 5)) {
    errors.rating = "Rating must be between 1 and 5";
  }

  return errors;
}

// Phase 4: Owner Testimonial Mutation & Filter Schemas
export const editTestimonialSchema = z.object({
  id: z.string().uuid("Invalid testimonial ID"),
  content: z
    .string()
    .trim()
    .min(10, "Testimonial must be at least 10 characters")
    .max(5000, "Testimonial cannot exceed 5000 characters"),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  company_name: z.string().trim().max(120).optional().or(z.literal("")),
  is_hidden: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
  on_wall_of_love: z.boolean().optional(),
});

export type EditTestimonialInput = z.infer<typeof editTestimonialSchema>;

export const testimonialFilterSchema = z.object({
  spaceId: z.string().uuid().optional().or(z.literal("all")),
  search: z.string().trim().max(100).optional(),
  rating: z.enum(["all", "5", "4", "3", "2", "1"]).default("all"),
  range: z.enum(["all", "7d", "30d", "90d"]).default("all"),
  visibility: z.enum(["all", "visible", "hidden"]).default("all"),
  favorite: z.enum(["all", "favorites"]).default("all"),
  wallOfLove: z.enum(["all", "wall"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

export type TestimonialFilter = z.infer<typeof testimonialFilterSchema>;

// Helper to determine if a testimonial is publicly eligible per non-negotiable rules
export function isPubliclyDisplayable(testimonial: {
  share_consent: boolean;
  is_hidden: boolean;
}): boolean {
  return testimonial.share_consent === true && testimonial.is_hidden === false;
}
