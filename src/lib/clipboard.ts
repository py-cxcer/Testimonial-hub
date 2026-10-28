/**
 * Copies text to the clipboard. `navigator.clipboard` only exists on secure origins
 * (https or localhost), so on a plain-http address (for example a LAN IP during
 * development) it is undefined. In that case fall back to a hidden textarea and
 * document.execCommand("copy"). Resolves to false if both methods fail.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path (permission denied, insecure context, ...)
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);

  const previousFocus = document.activeElement as HTMLElement | null;
  try {
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
    previousFocus?.focus?.();
  }
}
