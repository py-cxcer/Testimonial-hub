import { describe, it, expect } from "vitest";
import {
  fieldConfigSchema,
  createSpaceSchema,
  defaultFieldConfig,
} from "@/lib/validation/spaces";
import { makeSlug } from "@/lib/slug";

describe("Phase 2 — Spaces fieldConfig validation", () => {
  it("passes with default field configuration where name and email are enabled and required", () => {
    const result = fieldConfigSchema.safeParse(defaultFieldConfig);
    expect(result.success).toBe(true);
  });

  it("fails when a disabled field is set to required", () => {
    const invalidConfig = {
      ...defaultFieldConfig,
      company_name: { enabled: false, required: true },
    };
    const result = fieldConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.message.includes("A disabled field cannot be required"))).toBe(true);
    }
  });

  it("fails when name is disabled", () => {
    const invalidConfig = {
      ...defaultFieldConfig,
      name: { enabled: false, required: false },
    };
    const result = fieldConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Name must be enabled and required"))).toBe(true);
    }
  });

  it("fails when email is disabled", () => {
    const invalidConfig = {
      ...defaultFieldConfig,
      email: { enabled: false, required: false },
    };
    const result = fieldConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Email must be enabled and required"))).toBe(true);
    }
  });
});

describe("Phase 2 — createSpaceSchema validation", () => {
  it("validates a compliant space input", () => {
    const input = {
      title: "My Awesome Product",
      subtitle: "Give us your honest feedback",
      prompt: "What do you love most about using our product?",
      collectRating: true,
      theme: "warm",
      fieldConfig: defaultFieldConfig,
    };
    const result = createSpaceSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects empty title or prompt", () => {
    const input = {
      title: "",
      prompt: "",
      fieldConfig: defaultFieldConfig,
    };
    const result = createSpaceSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 100 characters", () => {
    const input = {
      title: "A".repeat(101),
      prompt: "Valid prompt",
      fieldConfig: defaultFieldConfig,
    };
    const result = createSpaceSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects prompt longer than 500 characters", () => {
    const input = {
      title: "Valid Title",
      prompt: "A".repeat(501),
      fieldConfig: defaultFieldConfig,
    };
    const result = createSpaceSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid theme selection", () => {
    const input = {
      title: "Valid Title",
      prompt: "Valid prompt",
      theme: "neon-blue",
      fieldConfig: defaultFieldConfig,
    };
    const result = createSpaceSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("Phase 2 — Slug generator", () => {
  it("generates a valid, URL-friendly slug with unique random suffix", () => {
    const slug1 = makeSlug("Test Product 101!");
    const slug2 = makeSlug("Test Product 101!");

    // Regex match format: ^[a-z0-9][a-z0-9-]{2,79}$
    const slugRegex = /^[a-z0-9][a-z0-9-]{2,79}$/;
    expect(slugRegex.test(slug1)).toBe(true);
    expect(slugRegex.test(slug2)).toBe(true);
    expect(slug1).not.toBe(slug2); // Unique UUID suffix ensures distinct slugs
  });
});
