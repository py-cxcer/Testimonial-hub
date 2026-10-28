import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  publicSubmissionBaseSchema,
  validateAgainstSpaceConfig,
  normalizeEmail,
} from "@/lib/validation/testimonials";
import { checkRateLimit } from "@/lib/rate-limit";
import { isOwnedPhotoUrl } from "@/lib/validation/photos";
import { PLAN_LIMITS, resolvePlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. IP and Rate Limiting
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "anonymous";
    const rateLimit = checkRateLimit(`submit_${ip}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    // 2. Body size safety & JSON parsing
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // 3. Base Zod Schema validation
    const baseParsed = publicSubmissionBaseSchema.safeParse(rawBody);
    if (!baseParsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: baseParsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = baseParsed.data;

    // 4. Honeypot check (must be empty)
    if (input.website && input.website.length > 0) {
      // Return a fake success to silent drop bot submissions
      return NextResponse.json(
        { ok: true, message: "Thank you for your testimonial!" },
        { status: 200 }
      );
    }

    // 5. Look up space by slug using privileged server admin client
    // (RLS has no public select on spaces or testimonials table directly for anonymous visitors)
    const adminSupabase = createAdminClient();

    const { data: space, error: spaceError } = await adminSupabase
      .from("spaces")
      .select("id, owner_id, title, collect_rating, field_config")
      .eq("slug", input.slug)
      .single();

    if (spaceError || !space) {
      return NextResponse.json(
        { error: "Collection space not found" },
        { status: 404 }
      );
    }

    // 6. Validate required/optional fields against the space configuration
    const fieldConfig = space.field_config as Record<
      string,
      { enabled: boolean; required: boolean }
    >;
    const dynamicErrors = validateAgainstSpaceConfig(input, {
      collect_rating: space.collect_rating,
      field_config: fieldConfig,
    });

    // Photo URLs must be files this app stored for this space (no arbitrary hotlinks).
    if (
      fieldConfig.profile_photo?.enabled &&
      input.profile_photo_url &&
      !isOwnedPhotoUrl(input.profile_photo_url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", space.id)
    ) {
      dynamicErrors.profile_photo = "Please upload the photo using the form.";
    }

    if (Object.keys(dynamicErrors).length > 0) {
      return NextResponse.json(
        {
          error: "Field validation error",
          issues: { fieldErrors: dynamicErrors },
        },
        { status: 400 }
      );
    }

    // 7. Check space owner's plan limit for testimonials
    const { data: sub } = await adminSupabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", space.owner_id)
      .single();

    const plan = resolvePlan(sub);
    const maxTestimonials = PLAN_LIMITS[plan].testimonialsPerSpace;

    const { count: currentTestimonials, error: countErr } = await adminSupabase
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .eq("space_id", space.id);

    if (countErr) {
      return NextResponse.json(
        { error: "Could not verify space capacity" },
        { status: 500 }
      );
    }

    if ((currentTestimonials ?? 0) >= maxTestimonials) {
      return NextResponse.json(
        {
          error:
            "This space has reached its testimonial collection limit. Please contact the space owner.",
        },
        { status: 403 }
      );
    }

    // 8. Prepare safe insert payload
    // Filter out disabled fields and sanitize email/consent
    const insertPayload: {
      space_id: string;
      name: string;
      email: string;
      company_name: string | null;
      social_links: Record<string, string>;
      profile_photo_url: string | null;
      content: string;
      rating: number | null;
      share_consent: boolean;
      consent_at: string | null;
      is_favorite: boolean;
      on_wall_of_love: boolean;
      is_hidden: boolean;
    } = {
      space_id: space.id,
      name: fieldConfig.name?.enabled ? input.name : "Anonymous",
      email: fieldConfig.email?.enabled ? normalizeEmail(input.email) : "",
      company_name:
        fieldConfig.company_name?.enabled && input.company_name
          ? input.company_name
          : null,
      social_links:
        fieldConfig.social_links?.enabled && input.social_links
          ? input.social_links
          : {},
      profile_photo_url:
        fieldConfig.profile_photo?.enabled && input.profile_photo_url
          ? input.profile_photo_url
          : null,
      content: input.content,
      rating: space.collect_rating && input.rating ? input.rating : null,
      share_consent: input.share_consent,
      consent_at: input.share_consent ? new Date().toISOString() : null,
      // Strictly ignore client attempts to set moderation/favorite flags
      is_favorite: false,
      on_wall_of_love: false,
      is_hidden: false,
    };

    const { data: inserted, error: insertError } = await adminSupabase
      .from("testimonials")
      .insert(insertPayload)
      .select("id, created_at")
      .single();

    if (insertError?.message.includes("TESTIMONIAL_LIMIT_REACHED")) {
      return NextResponse.json(
        {
          error:
            "This space has reached its testimonial collection limit. Please contact the space owner.",
        },
        { status: 403 }
      );
    }

    if (insertError || !inserted) {
      if (insertError) {
        console.error("Testimonial insert failed:", insertError.code, insertError.message);
      }
      return NextResponse.json(
        { error: "Failed to submit testimonial. Please try again." },
        { status: 500 }
      );
    }

    // 9. Return safe public DTO only (no submitter emails, private owner data, or internal flags)
    return NextResponse.json(
      {
        ok: true,
        message: "Thank you! Your testimonial has been submitted successfully.",
        id: inserted.id,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Testimonial submission error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
