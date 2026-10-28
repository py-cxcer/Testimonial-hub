"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copyText } from "@/lib/clipboard";
import {
  createSpaceAction,
  updateSpaceAction,
} from "@/actions/spaces";
import {
  defaultFieldConfig,
  type CreateSpaceInput,
  type FieldConfig,
} from "@/lib/validation/spaces";
import {
  Star,
  CheckCircle2,
  Copy,
  ExternalLink,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface SpaceFormProps {
  initialData?: {
    id: string;
    title: string;
    subtitle: string | null;
    prompt: string;
    collect_rating: boolean;
    theme: "light" | "warm" | "dark";
    field_config: unknown;
    slug?: string;
  };
  isEdit?: boolean;
}

const fieldLabels: Record<keyof FieldConfig, string> = {
  name: "Name",
  email: "Email address",
  company_name: "Company name",
  social_links: "Social media handles",
  profile_photo: "Avatar / Profile photo",
};

export default function SpaceForm({ initialData, isEdit = false }: SpaceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    spaceId: string;
    slug: string;
    publicUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [title, setTitle] = useState(initialData?.title || "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || "");
  const [prompt, setPrompt] = useState(
    initialData?.prompt ||
      "Would you like to share a quick sentence about your experience using our product?"
  );
  const [collectRating, setCollectRating] = useState(
    initialData?.collect_rating ?? true
  );
  const [theme, setTheme] = useState<"light" | "warm" | "dark">(
    initialData?.theme || "light"
  );
  const [fieldConfig, setFieldConfig] = useState<FieldConfig>(
    (initialData?.field_config as FieldConfig) || defaultFieldConfig
  );

  const toggleFieldEnabled = (fieldKey: keyof FieldConfig) => {
    if (fieldKey === "name" || fieldKey === "email") return; // Non-negotiable per guide
    setFieldConfig((prev) => {
      const willBeEnabled = !prev[fieldKey].enabled;
      return {
        ...prev,
        [fieldKey]: {
          enabled: willBeEnabled,
          required: willBeEnabled ? prev[fieldKey].required : false,
        },
      };
    });
  };

  const toggleFieldRequired = (fieldKey: keyof FieldConfig) => {
    if (fieldKey === "name" || fieldKey === "email") return; // Non-negotiable per guide
    setFieldConfig((prev) => {
      if (!prev[fieldKey].enabled) return prev; // Cannot require disabled field
      return {
        ...prev,
        [fieldKey]: {
          ...prev[fieldKey],
          required: !prev[fieldKey].required,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: CreateSpaceInput = {
      title,
      subtitle: subtitle || "",
      prompt,
      collectRating,
      theme,
      fieldConfig,
    };

    try {
      if (isEdit && initialData?.id) {
        const res = await updateSpaceAction({
          ...payload,
          id: initialData.id,
        });
        if (!res.ok) {
          setError(res.error);
        } else {
          router.push(`/spaces/${initialData.id}`);
          router.refresh();
        }
      } else {
        const res = await createSpaceAction(payload);
        if (!res.ok) {
          setError(res.error);
        } else {
          setSuccessData(res.data);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (successData?.publicUrl && (await copyText(successData.publicUrl))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setError("Could not copy automatically. Select the link and copy it manually.");
    }
  };

  // Success view with copyable link
  if (successData) {
    return (
      <div className="mx-auto max-w-xl space-y-8 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Space Created Successfully!</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Your space is ready to collect authentic customer testimonials.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-zinc-950/70 p-4 text-left">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
            Public Collection Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={successData.publicUrl}
              className="flex-1 truncate rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={`/spaces/${successData.spaceId}`}
            className="w-full sm:w-auto rounded-lg bg-slate-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-zinc-700"
          >
            Go to Space Dashboard
          </Link>
          <a
            href={successData.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Visit Public Form
          </a>
        </div>
      </div>
    );
  }

  // Live preview theme style helper
  const previewThemeClasses = {
    light: "bg-white text-zinc-900 border-zinc-200",
    warm: "bg-amber-50 text-amber-950 border-amber-200",
    dark: "bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border-slate-200 dark:border-zinc-800",
  }[theme];

  return (
    <div className="space-y-6">
      {!isEdit && (
        <div className="flex items-center gap-3">
          <Link
            href="/spaces"
            className="rounded-lg p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isEdit ? "Edit Space" : "Create New Space"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Configure your testimonial collection page settings and form fields.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form controls */}
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-7">
          <div className="space-y-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Basic Information</h2>

            <div className="space-y-1.5">
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                Space Name / Title <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <input
                id="title"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Acme SaaS Customer Love"
                className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="subtitle" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                Subtitle (Optional)
              </label>
              <input
                id="subtitle"
                maxLength={180}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Tell us how Acme made your daily routine easier"
                className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                Customer Prompt Question <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <textarea
                id="prompt"
                required
                rows={3}
                maxLength={500}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What did you like best about our service?"
                className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Theme & Rating Options */}
          <div className="space-y-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Design & Rating</h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {(["light", "warm", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-all ${
                      theme === t
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "border-zinc-800 bg-slate-50 dark:bg-zinc-950/40 text-slate-500 dark:text-zinc-400 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-white">
                  Collect Star Ratings
                </span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">
                  Allow customers to give a 1 to 5 star rating.
                </span>
              </div>
              <input
                type="checkbox"
                checked={collectRating}
                onChange={(e) => setCollectRating(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Configurable Form Fields */}
          <div className="space-y-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Form Field Settings</h2>
              <span className="text-xs text-slate-500 dark:text-zinc-500">Name & Email always required</span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-zinc-800">
              {(Object.keys(fieldConfig) as (keyof FieldConfig)[]).map((key) => {
                const isFixed = key === "name" || key === "email";
                const isEnabled = fieldConfig[key].enabled;
                const isRequired = fieldConfig[key].required;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                  >
                    <div>
                      <span className="block text-sm font-medium text-slate-800 dark:text-zinc-200">
                        {fieldLabels[key]}
                      </span>
                      {isFixed && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          Required default
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          disabled={isFixed}
                          checked={isEnabled}
                          onChange={() => toggleFieldEnabled(key)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        Enabled
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          disabled={isFixed || !isEnabled}
                          checked={isRequired}
                          onChange={() => toggleFieldRequired(key)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/spaces"
              className="rounded-lg border border-slate-200 dark:border-zinc-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Saving Space..." : isEdit ? "Update Space" : "Create Space"}
            </button>
          </div>
        </form>

        {/* Live Preview Panel */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Live Form Preview ({theme} theme)
          </div>

          <div
            className={`rounded-2xl border p-6 shadow-xl transition-colors duration-200 ${previewThemeClasses}`}
          >
            <div className="space-y-2 text-center border-b pb-4 border-current/10">
              <h3 className="text-xl font-bold">
                {title || "Your Space Title Here"}
              </h3>
              {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-current/5 p-3 text-xs font-medium">
                💬 {prompt || "Customer prompt appears here..."}
              </div>

              {collectRating && (
                <div className="space-y-1">
                  <span className="text-xs font-medium opacity-80">Rating</span>
                  <div className="flex gap-1 text-amber-600 dark:text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <span className="text-xs opacity-80">Name *</span>
                  <div className="h-8 rounded border border-current/20 bg-current/5" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs opacity-80">Email address *</span>
                  <div className="h-8 rounded border border-current/20 bg-current/5" />
                </div>

                {fieldConfig.company_name.enabled && (
                  <div className="space-y-1">
                    <span className="text-xs opacity-80">
                      Company name {fieldConfig.company_name.required && "*"}
                    </span>
                    <div className="h-8 rounded border border-current/20 bg-current/5" />
                  </div>
                )}

                {fieldConfig.social_links.enabled && (
                  <div className="space-y-1">
                    <span className="text-xs opacity-80">
                      Social handle / profile link{" "}
                      {fieldConfig.social_links.required && "*"}
                    </span>
                    <div className="h-8 rounded border border-current/20 bg-current/5" />
                  </div>
                )}

                {fieldConfig.profile_photo.enabled && (
                  <div className="space-y-1">
                    <span className="text-xs opacity-80">
                      Profile photo {fieldConfig.profile_photo.required && "*"}
                    </span>
                    <div className="h-8 rounded border border-current/20 bg-current/5" />
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-xs opacity-80">Your Testimonial *</span>
                  <div className="h-16 rounded border border-current/20 bg-current/5" />
                </div>
              </div>

              <div className="pt-2">
                <div className="h-9 w-full rounded bg-indigo-600 flex items-center justify-center font-medium text-xs text-white">
                  Send Testimonial
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
