import { describe, it, expect } from "vitest";
import { detectPhotoType, isOwnedPhotoUrl, photoUrlPrefix } from "./photos";

const SUPA = "https://proj.supabase.co";
const SPACE = "11111111-1111-1111-1111-111111111111";
const FILE = "22222222-2222-2222-2222-222222222222";

describe("detectPhotoType", () => {
  it("recognises jpeg, png and webp by magic bytes", () => {
    expect(detectPhotoType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(detectPhotoType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime).toBe("image/png");
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(detectPhotoType(webp)?.ext).toBe("webp");
  });

  it("rejects SVG, HTML, scripts, GIF and empty input regardless of claimed type", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(detectPhotoType(enc("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"))).toBeNull();
    expect(detectPhotoType(enc("<html><script>1</script></html>"))).toBeNull();
    expect(detectPhotoType(enc("GIF89a"))).toBeNull();
    expect(detectPhotoType(new Uint8Array())).toBeNull();
  });
});

describe("isOwnedPhotoUrl", () => {
  const good = `${photoUrlPrefix(SUPA, SPACE)}${FILE}.png`;

  it("accepts a file stored for this space", () => {
    expect(isOwnedPhotoUrl(good, SUPA, SPACE)).toBe(true);
  });

  it("rejects other hosts, other spaces, traversal, and odd file names", () => {
    expect(isOwnedPhotoUrl("https://evil.example/a.png", SUPA, SPACE)).toBe(false);
    expect(isOwnedPhotoUrl(good, SUPA, "99999999-9999-9999-9999-999999999999")).toBe(false);
    expect(isOwnedPhotoUrl(`${photoUrlPrefix(SUPA, SPACE)}../x.png`, SUPA, SPACE)).toBe(false);
    expect(isOwnedPhotoUrl(`${photoUrlPrefix(SUPA, SPACE)}${FILE}.svg`, SUPA, SPACE)).toBe(false);
    expect(isOwnedPhotoUrl(`${good}?x=<script>`, SUPA, SPACE)).toBe(false);
  });
});
