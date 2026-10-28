"use client";

import { useState } from "react";
import { Star, CheckCircle2, ShieldCheck, HeartHandshake } from "lucide-react";
import type { FieldConfig } from "@/lib/validation/spaces";

interface PublicCollectionFormProps {
  slug: string;
  title: string;
  subtitle: string | null;
  prompt: string;
  theme: "light" | "warm" | "dark";
  collectRating: boolean;
  fieldConfig: FieldConfig;
}

export default function PublicCollectionForm({
  slug,
  title,
  subtitle,
  prompt,
  theme,
  collectRating,
  fieldConfig,
}: PublicCollectionFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number | null>(collectRating ? 5 : null);
  const [shareConsent, setShareConsent] = useState(false); // Unchecked by default
  const [honeypot, setHoneypot] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const themeClasses = {
    light: {
      page: "bg-zinc-50 text-zinc-900",
      card: "bg-white border-zinc-200 text-zinc-900 shadow-xl",
      input: "bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500",
      promptBox: "bg-indigo-50/60 border-indigo-100 text-indigo-950",
      textMuted: "text-zinc-500",
      btn: "bg-indigo-600 hover:bg-indigo-700 text-white",
    },
    warm: {
      page: "bg-amber-50/60 text-amber-950",
      card: "bg-[#fffdf9] border-amber-200/80 text-amber-950 shadow-xl shadow-amber-900/5",
      input: "bg-amber-50/50 border-amber-200 text-amber-950 placeholder-amber-800/40 focus:border-amber-600",
      promptBox: "bg-amber-100/70 border-amber-200 text-amber-900",
      textMuted: "text-amber-800/70",
      btn: "bg-amber-700 hover:bg-amber-800 text-white",
    },
    dark: {
      page: "bg-zinc-950 text-zinc-100",
      card: "bg-zinc-900/80 border-zinc-800 text-zinc-100 shadow-2xl backdrop-blur-xl",
      input: "bg-zinc-950/70 border-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500",
      promptBox: "bg-indigo-950/30 border-indigo-900/40 text-indigo-200",
      textMuted: "text-zinc-400",
      btn: "bg-indigo-600 hover:bg-indigo-500 text-white",
    },
  }[theme];

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) {
      setProfilePhotoUrl("");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfilePhotoUrl("");
      setPhotoError("Photo must be 2 MB or smaller.");
      e.target.value = "";
      return;
    }
    setUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append("slug", slug);
      body.append("file", file);
      const res = await fetch("/api/uploads/profile-photo", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setProfilePhotoUrl("");
        setPhotoError(data?.error || "Could not upload the photo.");
        e.target.value = "";
      } else {
        setProfilePhotoUrl(data.url);
      }
    } catch {
      setProfilePhotoUrl("");
      setPhotoError("Network error while uploading the photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const payload = {
      slug,
      name,
      email,
      company_name: companyName,
      social_links: socialLink ? { profile: socialLink } : {},
      profile_photo_url: profilePhotoUrl,
      content,
      rating: collectRating ? rating : null,
      share_consent: shareConsent,
      website: honeypot, // Honeypot
    };

    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.issues?.fieldErrors) {
          setFieldErrors(data.issues.fieldErrors);
        } else {
          setGeneralError(data.error || "Failed to submit testimonial");
        }
      } else {
        setSubmitted(true);
      }
    } catch {
      setGeneralError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 ${themeClasses.page}`}>
        <div className={`w-full max-w-lg rounded-2xl border p-8 sm:p-10 text-center space-y-6 ${themeClasses.card}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Thank you!</h2>
            <p className={`text-sm ${themeClasses.textMuted}`}>
              Your testimonial for <span className="font-semibold">{title}</span> has been received and submitted successfully.
            </p>
          </div>
          <div className="pt-4 border-t border-current/10">
            <p className={`text-xs ${themeClasses.textMuted}`}>
              Powered by <span className="font-semibold">Testimonial Hub</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 py-12 ${themeClasses.page}`}>
      <div className={`w-full max-w-xl rounded-2xl border p-6 sm:p-10 space-y-8 ${themeClasses.card}`}>
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className={`text-sm ${themeClasses.textMuted}`}>{subtitle}</p>
          )}
        </div>

        {/* Prompt question card */}
        <div className={`rounded-xl border p-4 text-sm font-medium leading-relaxed ${themeClasses.promptBox}`}>
          <span className="font-semibold block mb-1">Question from the team:</span>
          &ldquo;{prompt}&rdquo;
        </div>

        {generalError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot field (hidden from view) */}
          <div style={{ display: "none" }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Rating */}
          {collectRating && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider">
                Rating
              </label>
              <div className="flex gap-1.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        rating && rating >= star
                          ? "fill-current"
                          : "fill-transparent stroke-current opacity-40"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {fieldErrors.rating && (
                <p className="text-xs text-rose-500">{fieldErrors.rating}</p>
              )}
            </div>
          )}

          {/* Testimonial Content */}
          <div className="space-y-1.5">
            <label htmlFor="content" className="block text-xs font-semibold uppercase tracking-wider">
              Your Testimonial <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="content"
              required
              rows={4}
              minLength={10}
              maxLength={5000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your honest review here..."
              className={`w-full rounded-xl border p-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${themeClasses.input}`}
            />
            {fieldErrors.content && (
              <p className="text-xs text-rose-500">{fieldErrors.content}</p>
            )}
          </div>

          {/* Submitter Name */}
          {fieldConfig.name?.enabled && (
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider">
                Your Name {fieldConfig.name.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="name"
                required={fieldConfig.name.required}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className={`w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${themeClasses.input}`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-rose-500">{fieldErrors.name}</p>
              )}
            </div>
          )}

          {/* Submitter Email */}
          {fieldConfig.email?.enabled && (
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider">
                Your Email {fieldConfig.email.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="email"
                type="email"
                required={fieldConfig.email.required}
                maxLength={320}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${themeClasses.input}`}
              />
              <span className={`text-[11px] block ${themeClasses.textMuted}`}>
                We will never share or publish your email address.
              </span>
              {fieldErrors.email && (
                <p className="text-xs text-rose-500">{fieldErrors.email}</p>
              )}
            </div>
          )}

          {/* Company Name */}
          {fieldConfig.company_name?.enabled && (
            <div className="space-y-1.5">
              <label htmlFor="companyName" className="block text-xs font-semibold uppercase tracking-wider">
                Company / Organization {fieldConfig.company_name.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="companyName"
                required={fieldConfig.company_name.required}
                maxLength={120}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className={`w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${themeClasses.input}`}
              />
              {fieldErrors.company_name && (
                <p className="text-xs text-rose-500">{fieldErrors.company_name}</p>
              )}
            </div>
          )}

          {/* Social Links */}
          {fieldConfig.social_links?.enabled && (
            <div className="space-y-1.5">
              <label htmlFor="socialLink" className="block text-xs font-semibold uppercase tracking-wider">
                Social Profile / Website {fieldConfig.social_links.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="socialLink"
                required={fieldConfig.social_links.required}
                maxLength={500}
                value={socialLink}
                onChange={(e) => setSocialLink(e.target.value)}
                placeholder="https://x.com/username or @handle"
                className={`w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${themeClasses.input}`}
              />
              {fieldErrors.social_links && (
                <p className="text-xs text-rose-500">{fieldErrors.social_links}</p>
              )}
            </div>
          )}

          {/* Profile Photo (uploaded to our storage; JPG/PNG/WebP up to 2 MB) */}
          {fieldConfig.profile_photo?.enabled && (
            <div className="space-y-1.5">
              <label htmlFor="profilePhoto" className="block text-xs font-semibold uppercase tracking-wider">
                Profile photo {fieldConfig.profile_photo.required && <span className="text-rose-500">*</span>}
              </label>
              <div className="flex items-center gap-3">
                {profilePhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePhotoUrl}
                    alt="Your uploaded profile photo"
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-full object-cover border border-current/20"
                  />
                )}
                <input
                  id="profilePhoto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingPhoto}
                  onChange={handlePhotoChange}
                  className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                />
              </div>
              <p className={`text-[11px] ${themeClasses.textMuted}`}>
                {uploadingPhoto ? "Uploading..." : "JPG, PNG or WebP, up to 2 MB."}
              </p>
              {(photoError || fieldErrors.profile_photo || fieldErrors.profile_photo_url) && (
                <p role="alert" className="text-xs text-rose-500">
                  {photoError || fieldErrors.profile_photo || fieldErrors.profile_photo_url}
                </p>
              )}
            </div>
          )}

          {/* Explicit Consent Checkbox (unchecked by default) */}
          <div className="rounded-xl border border-current/15 p-4 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shareConsent}
                onChange={(e) => setShareConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs leading-relaxed">
                I give permission to use this testimonial publicly in marketing materials and on website embeds.
              </span>
            </label>
            <div className="flex items-center gap-1.5 text-[11px] opacity-75">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Consent is optional. We will never share your private email.</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || uploadingPhoto}
            className={`w-full rounded-xl py-3.5 text-sm font-semibold shadow-md transition-all disabled:opacity-50 ${themeClasses.btn}`}
          >
            {loading ? "Submitting..." : "Send Testimonial"}
          </button>
        </form>

        <footer className="text-center pt-2">
          <p className={`text-xs ${themeClasses.textMuted}`}>
            Powered by <span className="font-semibold">Testimonial Hub</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
