import { describe, it, expect } from "vitest";
import {
  publicSubmissionBaseSchema,
  validateAgainstSpaceConfig,
  normalizeEmail,
} from "@/lib/validation/testimonials";

describe("Phase 3 — Testimonial validation & email normalization", () => {
  it("normalizes emails properly by trimming whitespace and lowercasing", () => {
    expect(normalizeEmail("  User.Name@Example.COM  ")).toBe("user.name@example.com");
  });

  it("validates base submission schema successfully", () => {
    const valid = {
      slug: "test-space-1234",
      name: "Jane Doe",
      email: "jane@example.com",
      content: "This product exceeded all of my expectations!",
      rating: 5,
      share_consent: true,
      website: "", // Honeypot empty
    };
    const result = publicSubmissionBaseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("fails when content is shorter than 10 characters", () => {
    const invalid = {
      slug: "test-space-1234",
      name: "Jane Doe",
      email: "jane@example.com",
      content: "Too short",
      rating: 5,
    };
    const result = publicSubmissionBaseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("parses a filled honeypot so the route can silently drop it (not tip off bots)", () => {
    const spam = {
      slug: "test-space-1234",
      name: "Bot",
      email: "bot@spam.com",
      content: "Great service check out my link",
      website: "https://spamlink.com",
    };
    const result = publicSubmissionBaseSchema.safeParse(spam);
    expect(result.success).toBe(true);
  });
});

describe("Phase 3 — validateAgainstSpaceConfig", () => {
  const baseConfig = {
    collect_rating: true,
    field_config: {
      name: { enabled: true, required: true },
      email: { enabled: true, required: true },
      company_name: { enabled: true, required: false },
      social_links: { enabled: false, required: false },
      profile_photo: { enabled: false, required: false },
    },
  };

  it("returns no errors when all required enabled fields are present", () => {
    const input = {
      slug: "test-space-1234",
      name: "Alice",
      email: "alice@example.com",
      company_name: "",
      social_links: {},
      content: "Fantastic customer support!",
      rating: 5,
      share_consent: true,
    };
    const errors = validateAgainstSpaceConfig(input, baseConfig);
    expect(Object.keys(errors).length).toBe(0);
  });

  it("returns error when required name is empty", () => {
    const input = {
      slug: "test-space-1234",
      name: "",
      email: "alice@example.com",
      company_name: "",
      social_links: {},
      content: "Fantastic customer support!",
      rating: 5,
      share_consent: false,
    };
    const errors = validateAgainstSpaceConfig(input, baseConfig);
    expect(errors.name).toBe("This field is required");
  });

  it("rejects invalid email addresses", () => {
    const input = {
      slug: "test-space-1234",
      name: "Alice",
      email: "not-an-email",
      company_name: "",
      social_links: {},
      content: "Fantastic customer support!",
      rating: 5,
      share_consent: false,
    };
    const errors = validateAgainstSpaceConfig(input, baseConfig);
    expect(errors.email).toBe("Enter a valid email address");
  });

  it("rejects ratings when space does not collect ratings", () => {
    const noRatingConfig = {
      ...baseConfig,
      collect_rating: false,
    };
    const input = {
      slug: "test-space-1234",
      name: "Alice",
      email: "alice@example.com",
      company_name: "",
      social_links: {},
      content: "Fantastic customer support!",
      rating: 4,
      share_consent: false,
    };
    const errors = validateAgainstSpaceConfig(input, noRatingConfig);
    expect(errors.rating).toBe("This space does not collect ratings");
  });

  it("rejects ratings outside range 1-5", () => {
    const input = {
      slug: "test-space-1234",
      name: "Alice",
      email: "alice@example.com",
      company_name: "",
      social_links: {},
      content: "Fantastic customer support!",
      rating: 6,
      share_consent: false,
    };
    const errors = validateAgainstSpaceConfig(input, baseConfig);
    expect(errors.rating).toBe("Rating must be between 1 and 5");
  });
});

describe("publicSubmissionBaseSchema profile_photo_url", () => {
  const base = {
    slug: "my-space",
    content: "Fantastic customer support!",
  };

  it("accepts http(s) URLs and empty string", () => {
    expect(
      publicSubmissionBaseSchema.safeParse({ ...base, profile_photo_url: "https://example.com/a.jpg" }).success
    ).toBe(true);
    expect(publicSubmissionBaseSchema.safeParse({ ...base, profile_photo_url: "" }).success).toBe(true);
  });

  it("rejects non-http schemes such as javascript: and data:", () => {
    for (const url of ["javascript:alert(1)", "data:text/html;base64,AAAA", "ftp://example.com/a.jpg"]) {
      expect(publicSubmissionBaseSchema.safeParse({ ...base, profile_photo_url: url }).success).toBe(false);
    }
  });
});
