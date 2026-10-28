import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  MAX_PROFILE_PHOTO_BYTES,
  PROFILE_PHOTO_BUCKET,
  detectPhotoType,
  photoUrlPrefix,
} from "@/lib/validation/photos";

export const dynamic = "force-dynamic";

/**
 * Public (no account) profile-photo upload for the testimonial form.
 * Abuse controls: rate limit, space must exist and have the photo field enabled,
 * hard size cap, content sniffing (no SVG/HTML), random server-chosen file name.
 */
export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "anonymous";
    const rate = checkRateLimit(`upload_${ip}`, { windowMs: 60 * 1000, maxRequests: 5 });
    if (!rate.success) {
      return NextResponse.json({ error: "Too many uploads. Please wait a moment." }, { status: 429 });
    }

    // Reject oversized bodies before buffering them.
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_PROFILE_PHOTO_BYTES + 64 * 1024) {
      return NextResponse.json({ error: "Photo must be 2 MB or smaller." }, { status: 413 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
    }

    const slug = form.get("slug");
    const file = form.get("file");
    if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug) || !(file instanceof File)) {
      return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_PROFILE_PHOTO_BYTES) {
      return NextResponse.json({ error: "Photo must be 2 MB or smaller." }, { status: 413 });
    }

    const admin = createAdminClient();
    const { data: space } = await admin
      .from("spaces")
      .select("id, field_config")
      .eq("slug", slug)
      .maybeSingle();

    const photoField = (space?.field_config as Record<string, { enabled?: boolean }> | undefined)?.profile_photo;
    if (!space || !photoField?.enabled) {
      return NextResponse.json({ error: "Photo uploads are not enabled for this space." }, { status: 404 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectPhotoType(bytes);
    if (!type) {
      return NextResponse.json({ error: "Please upload a JPG, PNG, or WebP image." }, { status: 415 });
    }

    const path = `${space.id}/${randomUUID()}.${type.ext}`;
    const { error: uploadError } = await admin.storage
      .from(PROFILE_PHOTO_BUCKET)
      .upload(path, bytes, { contentType: type.mime, upsert: false, cacheControl: "31536000" });

    if (uploadError) {
      console.error("Profile photo upload failed:", uploadError.message);
      return NextResponse.json({ error: "Could not upload the photo. Please try again." }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    return NextResponse.json({ ok: true, url: `${photoUrlPrefix(supabaseUrl, space.id)}${path.split("/")[1]}` }, { status: 201 });
  } catch (err: unknown) {
    console.error("Profile photo upload error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
