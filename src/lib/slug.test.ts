import { describe, it, expect } from "vitest";
import { makeSlug } from "./slug";

describe("makeSlug utility", () => {
  it("normalizes spaces and special characters into lowercase hyphenated strings", () => {
    const slug = makeSlug("Acme Corporation & Co!");
    expect(slug).toMatch(/^acme-corporation-co-[a-z0-9]{8}$/);
  });

  it("handles non-ASCII characters by stripping diacritics", () => {
    const slug = makeSlug("Café Münich");
    expect(slug).toMatch(/^cafe-munich-[a-z0-9]{8}$/);
  });

  it("falls back to 'space' prefix if title is purely symbols", () => {
    const slug = makeSlug("!@#$%^&*()");
    expect(slug).toMatch(/^space-[a-z0-9]{8}$/);
  });

  it("satisfies the public submission slug regex", () => {
    const slug = makeSlug("My Test Space");
    expect(/^[a-z0-9][a-z0-9-]+$/.test(slug)).toBe(true);
  });
});
