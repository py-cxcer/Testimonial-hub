import { describe, it, expect } from "vitest";
import {
  editTestimonialSchema,
  testimonialFilterSchema,
  isPubliclyDisplayable,
} from "@/lib/validation/testimonials";

describe("Phase 4 — Edit testimonial schema validation", () => {
  it("validates compliant testimonial edit payload", () => {
    const valid = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      content: "Updated customer review content that is descriptive and nice.",
      rating: 5,
      company_name: "New Company Inc.",
    };
    const result = editTestimonialSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects edit if content is shorter than 10 characters", () => {
    const invalid = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      content: "Short",
    };
    const result = editTestimonialSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects edit if rating is not between 1 and 5", () => {
    const invalid = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      content: "Valid testimonial content here.",
      rating: 10,
    };
    const result = editTestimonialSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("Phase 4 — TestimonialFilter schema validation", () => {
  it("parses valid filter criteria with default pagination", () => {
    const result = testimonialFilterSchema.safeParse({
      rating: "5",
      visibility: "visible",
      favorite: "favorites",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(15);
    }
  });
});

describe("Phase 4 — Public Display Eligibility rules", () => {
  it("allows display only when share_consent is true AND is_hidden is false", () => {
    expect(isPubliclyDisplayable({ share_consent: true, is_hidden: false })).toBe(true);
  });

  it("withholds display if share_consent is false, even if not hidden", () => {
    expect(isPubliclyDisplayable({ share_consent: false, is_hidden: false })).toBe(false);
  });

  it("withholds display if is_hidden is true, even if consented", () => {
    expect(isPubliclyDisplayable({ share_consent: true, is_hidden: true })).toBe(false);
  });

  it("withholds display if both unconsented and hidden", () => {
    expect(isPubliclyDisplayable({ share_consent: false, is_hidden: true })).toBe(false);
  });
});

describe("testimonialFilterSchema hardening", () => {
  it("rejects malformed space ids so they never reach the database", () => {
    expect(testimonialFilterSchema.safeParse({ spaceId: "not-a-uuid" }).success).toBe(false);
  });

  it("accepts the date range options and defaults to all", () => {
    expect(testimonialFilterSchema.parse({}).range).toBe("all");
    expect(testimonialFilterSchema.parse({ range: "7d" }).range).toBe("7d");
    expect(testimonialFilterSchema.safeParse({ range: "forever" }).success).toBe(false);
  });

  it("rejects non-positive page numbers", () => {
    expect(testimonialFilterSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(testimonialFilterSchema.safeParse({ page: "-3" }).success).toBe(false);
  });
});
