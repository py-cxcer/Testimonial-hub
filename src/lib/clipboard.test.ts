import { describe, it, expect, vi, afterEach } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("uses the async Clipboard API when it is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyText("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when navigator.clipboard is undefined (insecure http origin)", async () => {
    vi.stubGlobal("navigator", {});
    const exec = vi.fn().mockReturnValue(true);
    (document as unknown as { execCommand: unknown }).execCommand = exec;
    expect(await copyText("snippet")).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull(); // temp element is cleaned up
  });

  it("falls back when writeText rejects (permission denied)", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    (document as unknown as { execCommand: unknown }).execCommand = vi.fn().mockReturnValue(true);
    expect(await copyText("x")).toBe(true);
  });

  it("returns false (never throws) when every method fails", async () => {
    vi.stubGlobal("navigator", {});
    (document as unknown as { execCommand: unknown }).execCommand = vi.fn().mockImplementation(() => {
      throw new Error("unsupported");
    });
    expect(await copyText("x")).toBe(false);
  });
});
