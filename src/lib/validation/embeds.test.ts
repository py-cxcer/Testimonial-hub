import { describe, it, expect } from "vitest";
import {
  embedConfigSchema,
  resolveEmbedConfig,
  toPublicEmbedDTO,
} from "@/lib/validation/embeds";

describe("Phase 6 — Embed configuration validation", () => {
  it("validates compliant embed config", () => {
    const valid = {
      spaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      layout: "carousel",
      darkMode: true,
      backgroundColor: "#18181b",
      animationEnabled: false,
      showRating: true,
    };
    const result = embedConfigSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid background color formats", () => {
    const invalid = {
      spaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      backgroundColor: "red", // not hex
    };
    const result = embedConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("applies safe defaults (masonry, light, #ffffff, animation false)", () => {
    const minimal = {
      spaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    };
    const result = embedConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layout).toBe("masonry");
      expect(result.data.darkMode).toBe(false);
      expect(result.data.backgroundColor).toBe("#ffffff");
      expect(result.data.animationEnabled).toBe(false);
    }
  });
});

describe("Phase 6 — toPublicEmbedDTO data exclusion & privacy", () => {
  const baseTestimonial = {
    id: "test-1",
    name: "Jane Doe",
    email: "jane@private.com", // Private field
    company_name: "Acme",
    profile_photo_url: "https://example.com/photo.jpg",
    content: "Loved the product!",
    rating: 5,
    share_consent: true,
    is_hidden: false,
    created_at: "2026-10-26T12:00:00Z",
    owner_id: "user-secret-999", // Private owner field
  };

  it("serializes public DTO for consented, unhidden testimonials omitting private fields", () => {
    const dto = toPublicEmbedDTO(baseTestimonial);
    expect(dto).not.toBeNull();
    if (dto) {
      expect(dto.id).toBe("test-1");
      expect(dto.name).toBe("Jane Doe");
      expect(dto.company_name).toBe("Acme");
      const record = dto as unknown as Record<string, unknown>;
      expect(record.email).toBeUndefined(); // EMAIL MUST NEVER BE EXPOSED
      expect(record.owner_id).toBeUndefined(); // OWNER ID NEVER EXPOSED
    }
  });

  it("returns null for non-consented testimonials", () => {
    const nonConsented = { ...baseTestimonial, share_consent: false };
    expect(toPublicEmbedDTO(nonConsented)).toBeNull();
  });

  it("returns null for hidden testimonials even if consented", () => {
    const hidden = { ...baseTestimonial, is_hidden: true };
    expect(toPublicEmbedDTO(hidden)).toBeNull();
  });
});

describe("resolveEmbedConfig", () => {
  const saved = {
    layout: "carousel",
    dark_mode: true,
    background_color: "#112233",
    animation_enabled: true,
    show_rating: false,
  };

  it("uses safe defaults when nothing is saved", () => {
    expect(resolveEmbedConfig(null)).toEqual({
      layout: "masonry",
      darkMode: false,
      backgroundColor: "#ffffff",
      animationEnabled: false,
      showRating: true,
    });
  });

  it("applies the saved design", () => {
    expect(resolveEmbedConfig(saved)).toEqual({
      layout: "carousel",
      darkMode: true,
      backgroundColor: "#112233",
      animationEnabled: true,
      showRating: false,
    });
  });

  it("lets query overrides win over the saved design (builder preview)", () => {
    const c = resolveEmbedConfig(saved, { layout: "masonry", dark: "false", bg: "#abcdef", anim: "false", rating: "true" });
    expect(c).toEqual({ layout: "masonry", darkMode: false, backgroundColor: "#abcdef", animationEnabled: false, showRating: true });
  });

  it("falls back for invalid layout and unsafe backgrounds (no injection)", () => {
    const c = resolveEmbedConfig(saved, { layout: "grid", bg: '"><script>alert(1)</script>' });
    expect(c.layout).toBe("carousel");
    expect(c.backgroundColor).toBe("#18181b");
    expect(resolveEmbedConfig(null, { bg: "red" }).backgroundColor).toBe("#ffffff");
  });

  it("never shows ratings when the space does not collect them", () => {
    expect(resolveEmbedConfig({ ...saved, show_rating: true }, { rating: "true" }, false).showRating).toBe(false);
  });
});

describe("widget types", () => {
  it("accepts every supported widget type in the config schema", () => {
    for (const layout of ["masonry", "carousel", "marquee", "single", "badge"]) {
      expect(
        embedConfigSchema.safeParse({ spaceId: "11111111-1111-1111-1111-111111111111", layout }).success
      ).toBe(true);
    }
  });

  it("rejects unknown widget types", () => {
    expect(
      embedConfigSchema.safeParse({ spaceId: "11111111-1111-1111-1111-111111111111", layout: "slideshow" }).success
    ).toBe(false);
  });

  it("resolves new types from saved config and query, and falls back for unknown ones", () => {
    const saved = { layout: "marquee", dark_mode: false, background_color: "#ffffff", animation_enabled: false, show_rating: true };
    expect(resolveEmbedConfig(saved).layout).toBe("marquee");
    expect(resolveEmbedConfig(saved, { layout: "badge" }).layout).toBe("badge");
    expect(resolveEmbedConfig(saved, { layout: "single" }).layout).toBe("single");
    expect(resolveEmbedConfig({ ...saved, layout: "bogus" }).layout).toBe("masonry");
    expect(resolveEmbedConfig(saved, { layout: "<script>" }).layout).toBe("marquee");
  });
});
