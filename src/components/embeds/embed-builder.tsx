"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { saveEmbedConfigAction } from "@/actions/embeds";
import type { EmbedConfigInput, EmbedLayout } from "@/lib/validation/embeds";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { copyText } from "@/lib/clipboard";

interface EmbedBuilderProps {
  spaceId: string;
  spaceTitle: string;
  /** Public Wall of Love testimonials this embed will show (curated + consented + visible). */
  wallCount: number;
  initialConfig?: {
    layout: EmbedLayout;
    dark_mode: boolean;
    background_color: string;
    animation_enabled: boolean;
    show_rating: boolean;
  };
}

const SWATCHES = ["#ffffff", "#f4f4f5", "#eef2ff", "#fff7ed", "#ecfdf5", "#18181b", "#0f172a"];

function escapeAttr(v: string) {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line-strong"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

const WIDGETS: { value: EmbedLayout; label: string; hint: string }[] = [
  { value: "masonry", label: "Wall of Love", hint: "Staggered grid of all your picks" },
  { value: "carousel", label: "Carousel", hint: "One at a time with arrows" },
  { value: "marquee", label: "Marquee", hint: "Auto-scrolling strip" },
  { value: "single", label: "Single", hint: "One featured testimonial" },
  { value: "badge", label: "Rating badge", hint: "Average stars and count" },
];

/** Suggested iframe height (px) for the iframe-only snippet and preview. */
const HEIGHTS: Record<EmbedLayout, number> = {
  masonry: 600,
  carousel: 380,
  marquee: 340,
  single: 320,
  badge: 170,
};

function LayoutThumb({ kind }: { kind: EmbedLayout }) {
  const box = "rounded-[3px] bg-line-strong";
  switch (kind) {
    case "masonry":
      return (
        <div className="grid h-12 w-full grid-cols-3 gap-1" aria-hidden="true">
          <div className="space-y-1"><div className={cn(box, "h-6")} /><div className={cn(box, "h-4")} /></div>
          <div className="space-y-1"><div className={cn(box, "h-4")} /><div className={cn(box, "h-6")} /></div>
          <div className="space-y-1"><div className={cn(box, "h-7")} /><div className={cn(box, "h-3")} /></div>
        </div>
      );
    case "carousel":
      return (
        <div className="flex h-12 w-full items-center gap-1" aria-hidden="true">
          <div className={cn(box, "h-6 w-3 opacity-50")} />
          <div className={cn(box, "h-10 flex-1")} />
          <div className={cn(box, "h-6 w-3 opacity-50")} />
        </div>
      );
    case "marquee":
      return (
        <div className="flex h-12 w-full items-center gap-1 overflow-hidden" aria-hidden="true">
          <div className={cn(box, "h-9 w-8 shrink-0 opacity-50")} />
          <div className={cn(box, "h-9 w-10 shrink-0")} />
          <div className={cn(box, "h-9 w-10 shrink-0")} />
          <div className={cn(box, "h-9 w-8 shrink-0 opacity-50")} />
        </div>
      );
    case "single":
      return (
        <div className="flex h-12 w-full items-center justify-center" aria-hidden="true">
          <div className={cn(box, "h-10 w-3/4")} />
        </div>
      );
    case "badge":
      return (
        <div className="flex h-12 w-full items-center justify-center gap-1.5" aria-hidden="true">
          <div className="flex -space-x-1.5">
            <span className="h-5 w-5 rounded-full bg-line-strong ring-2 ring-surface" />
            <span className="h-5 w-5 rounded-full bg-line-strong ring-2 ring-surface" />
            <span className="h-5 w-5 rounded-full bg-line-strong ring-2 ring-surface" />
          </div>
          <div className={cn(box, "h-3 w-10")} />
        </div>
      );
  }
}

export default function EmbedBuilder({
  spaceId,
  spaceTitle,
  wallCount,
  initialConfig,
}: EmbedBuilderProps) {
  const router = useRouter();
  const [layout, setLayout] = useState<EmbedLayout>(initialConfig?.layout ?? "masonry");
  const [darkMode, setDarkMode] = useState(initialConfig?.dark_mode ?? false);
  const [backgroundColor, setBackgroundColor] = useState(initialConfig?.background_color ?? "#ffffff");
  const [animationEnabled, setAnimationEnabled] = useState(initialConfig?.animation_enabled ?? false);
  const [showRating, setShowRating] = useState(initialConfig?.show_rating ?? true);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snippetMode, setSnippetMode] = useState<"script" | "iframe">("script");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewUrl = `${origin}/embed/${spaceId}?layout=${layout}&dark=${darkMode}&bg=${encodeURIComponent(
    backgroundColor
  )}&anim=${animationEnabled}&rating=${showRating}`;
  const cleanEmbedUrl = `${origin}/embed/${spaceId}`;

  const loaderSnippet = `<div data-testimonial-hub="${spaceId}"></div>\n<script async src="${origin}/embed.js"></script>`;
  const iframeSnippet = `<iframe
  src="${cleanEmbedUrl}"
  width="100%"
  height="${HEIGHTS[layout]}"
  frameborder="0"
  scrolling="no"
  sandbox="allow-scripts allow-same-origin"
  referrerpolicy="strict-origin-when-cross-origin"
  title="${escapeAttr(spaceTitle)} Customer Testimonials"
></iframe>`;
  const activeSnippet = snippetMode === "script" ? loaderSnippet : iframeSnippet;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    const payload: EmbedConfigInput = {
      spaceId,
      layout,
      darkMode,
      backgroundColor,
      animationEnabled,
      showRating,
    };

    const res = await saveEmbedConfigAction(payload);
    if (!res.ok) {
      setError(res.error);
    } else {
      setSavedSuccess(true);
      router.refresh();
      setTimeout(() => setSavedSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleCopySnippet = async () => {
    if (await copyText(activeSnippet)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setError("Could not copy automatically. Select the code and copy it manually.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-fg">Embed widget</h2>
          <p className="text-sm text-muted">
            {wallCount === 0 ? (
              <>
                Nothing to show yet. Heart testimonials in your{" "}
                <Link href={`/spaces/${spaceId}/inbox`} className="font-medium text-accent-ink underline">
                  inbox
                </Link>{" "}
                to add them to the Wall of Love.
              </>
            ) : (
              <>
                Showing your <strong className="text-fg">{wallCount}</strong> public Wall of Love testimonial
                {wallCount === 1 ? "" : "s"}.{" "}
                <Link href={`/spaces/${spaceId}/wall-of-love`} className="font-medium text-accent-ink underline">
                  Manage Wall of Love
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/wall/${spaceId}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-fg shadow-card hover:bg-surface-2"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Public page
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : savedSuccess ? "Saved" : "Save design"}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      )}
      {savedSuccess && (
        <div role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">
          Design saved. Your embed and public page now use it.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="space-y-3 p-5">
            <h3 className="text-sm font-semibold text-fg">Widget type</h3>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Widget type">
              {WIDGETS.map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={layout === value}
                  onClick={() => setLayout(value)}
                  title={hint}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    layout === value ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong"
                  )}
                >
                  <LayoutThumb kind={value} />
                  <span
                    className={cn("mt-2 block text-xs font-medium", layout === value ? "text-accent-ink" : "text-fg")}
                  >
                    {label}
                  </span>
                  <span className="block text-[11px] leading-tight text-muted">{hint}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-fg">Appearance</h3>

            <Switch
              checked={darkMode}
              label="Dark cards"
              description="For sites with a dark background"
              onChange={(v) => {
                setDarkMode(v);
                if (v && backgroundColor === "#ffffff") setBackgroundColor("#18181b");
                else if (!v && backgroundColor === "#18181b") setBackgroundColor("#ffffff");
              }}
            />

            <div className="space-y-2">
              <label htmlFor="bgHex" className="block text-sm font-medium text-fg">
                Background
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Background presets">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBackgroundColor(c)}
                    aria-label={`Use ${c}`}
                    aria-pressed={backgroundColor.toLowerCase() === c}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "h-7 w-7 rounded-full border",
                      backgroundColor.toLowerCase() === c
                        ? "ring-2 ring-accent ring-offset-2 ring-offset-surface"
                        : "border-line-strong"
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick a background colour"
                  value={/^#[0-9A-Fa-f]{6}$/.test(backgroundColor) ? backgroundColor : "#ffffff"}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-line bg-surface p-1"
                />
                <input
                  id="bgHex"
                  type="text"
                  maxLength={7}
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-sm uppercase text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            <Switch
              checked={showRating}
              label="Show star ratings"
              description="Only when your space collects ratings"
              onChange={setShowRating}
            />
            <Switch
              checked={animationEnabled}
              label="Hover animation"
              description="Cards lift slightly on hover"
              onChange={setAnimationEnabled}
            />
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-4 lg:col-span-8">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5">
              <span className="text-xs font-medium text-muted">Live preview (unsaved changes included)</span>
              <div className="flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Preview size">
                {(
                  [
                    ["desktop", Monitor, "Desktop"],
                    ["mobile", Smartphone, "Mobile"],
                  ] as const
                ).map(([value, Icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDevice(value)}
                    aria-pressed={device === value}
                    aria-label={`${label} preview`}
                    className={cn(
                      "inline-flex h-7 w-8 items-center justify-center rounded-md",
                      device === value ? "bg-accent-soft text-accent-ink" : "text-muted hover:text-fg"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-surface-2 p-3 sm:p-5">
              <div
                className={cn(
                  "mx-auto overflow-hidden rounded-lg border border-line bg-white shadow-card transition-[max-width]",
                  device === "mobile" ? "max-w-[390px]" : "max-w-full"
                )}
              >
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  title="Embed live preview"
                  className="block w-full border-0"
                  style={{ height: Math.min(HEIGHTS[layout] + 20, 580) }}
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div role="tablist" aria-label="Embed code format" className="flex gap-1 rounded-lg bg-surface-2 p-1">
                {(
                  [
                    ["script", "Script (auto-resize)"],
                    ["iframe", "Iframe only"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={snippetMode === mode}
                    onClick={() => setSnippetMode(mode)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      snippetMode === mode ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={handleCopySnippet}>
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy code
                  </>
                )}
              </Button>
            </div>
            <textarea
              readOnly
              rows={snippetMode === "script" ? 3 : 9}
              aria-label="Embed code"
              value={activeSnippet}
              className="w-full resize-none rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs text-fg outline-none"
            />
            <p className="text-xs text-muted">
              Paste into Webflow, WordPress, Shopify or any HTML page. The embed always uses your last{" "}
              <strong className="text-fg">saved</strong> design (use Save design); the preview also shows unsaved
              changes.
              {snippetMode === "iframe" && " The iframe-only version has a fixed height and does not auto-resize."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
