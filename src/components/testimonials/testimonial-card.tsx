"use client";

import { useEffect, useRef, useState } from "react";
import {
  Heart,
  Star,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  MoreHorizontal,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  toggleFavoriteAction,
  toggleWallOfLoveAction,
  toggleVisibilityAction,
  editTestimonialAction,
  deleteTestimonialAction,
} from "@/actions/testimonials";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/components/ui/cn";

export interface TestimonialItem {
  id: string;
  space_id: string;
  name: string;
  email: string;
  company_name: string | null;
  content: string;
  rating: number | null;
  share_consent: boolean;
  consent_at: string | null;
  is_favorite: boolean;
  on_wall_of_love: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  profile_photo_url?: string | null;
  space_title?: string;
}

interface TestimonialCardProps {
  item: TestimonialItem;
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export default function TestimonialCard({ item }: TestimonialCardProps) {
  const [content, setContent] = useState(item.content);
  const [rating, setRating] = useState<number | null>(item.rating);
  const [companyName, setCompanyName] = useState<string | null>(item.company_name);
  const [isFavorite, setIsFavorite] = useState(item.is_favorite);
  const [onWallOfLove, setOnWallOfLove] = useState(item.on_wall_of_love);
  const [isHidden, setIsHidden] = useState(item.is_hidden);
  const [deleted, setDeleted] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [editRating, setEditRating] = useState(item.rating ?? 5);
  const [editCompany, setEditCompany] = useState(item.company_name || "");
  const [savingEdit, setSavingEdit] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  // Close the overflow menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleToggleFavorite = async () => {
    setMenuOpen(false);
    const next = !isFavorite;
    setIsFavorite(next);
    const res = await toggleFavoriteAction(item.id, next);
    if (!res.ok) {
      setIsFavorite(!next);
      setActionError(res.error);
    }
  };

  const handleToggleWallOfLove = async () => {
    const next = !onWallOfLove;
    setOnWallOfLove(next);
    const res = await toggleWallOfLoveAction(item.id, next);
    if (!res.ok) {
      setOnWallOfLove(!next);
      setActionError(res.error);
    }
  };

  const handleToggleVisibility = async () => {
    setMenuOpen(false);
    const next = !isHidden;
    setIsHidden(next);
    const res = await toggleVisibilityAction(item.id, next);
    if (!res.ok) {
      setIsHidden(!next);
      setActionError(res.error);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    setActionError(null);

    const res = await editTestimonialAction({
      id: item.id,
      content: editContent,
      rating: editRating,
      company_name: editCompany,
    });

    if (!res.ok) {
      setActionError(res.error);
    } else {
      setContent(editContent);
      setRating(editRating);
      setCompanyName(editCompany);
      setIsEditing(false);
    }
    setSavingEdit(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setActionError(null);
    const res = await deleteTestimonialAction(item.id);
    if (!res.ok) {
      setActionError(res.error);
      setDeleting(false);
      setShowDeleteConfirm(false);
    } else {
      setDeleted(true);
    }
  };

  if (deleted) return null;

  const isPubliclyEligible = item.share_consent && !isHidden;

  const menuItem =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-fg hover:bg-surface-2";

  return (
    <article
      className={cn(
        "rounded-xl border bg-surface p-5 shadow-card transition-colors",
        isHidden ? "border-line opacity-70" : "border-line hover:border-line-strong"
      )}
    >
      {actionError && (
        <div role="alert" className="mb-4 rounded-lg bg-danger-soft p-2.5 text-xs text-danger">
          {actionError}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={item.name} src={item.profile_photo_url} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{item.name}</p>
            <p className="truncate text-xs text-muted">
              {companyName ? `${companyName} · ` : ""}
              {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleToggleWallOfLove}
            aria-pressed={onWallOfLove}
            title={onWallOfLove ? "Remove from Wall of Love" : "Add to Wall of Love"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
              onWallOfLove
                ? "bg-danger-soft text-danger"
                : "text-muted hover:bg-surface-2 hover:text-fg"
            )}
          >
            <Heart className={cn("h-4 w-4", onWallOfLove && "fill-current")} aria-hidden="true" />
            <span className="hidden sm:inline">{onWallOfLove ? "On Wall of Love" : "Add to Wall"}</span>
            <span className="sr-only sm:hidden">
              {onWallOfLove ? "Remove from Wall of Love" : "Add to Wall of Love"}
            </span>
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-line bg-surface p-1 shadow-pop"
              >
                <button role="menuitem" type="button" onClick={handleToggleFavorite} className={menuItem}>
                  <Star className={cn("h-4 w-4", isFavorite && "fill-star text-star")} aria-hidden="true" />
                  {isFavorite ? "Remove favorite" : "Mark as favorite"}
                </button>
                <button role="menuitem" type="button" onClick={handleToggleVisibility} className={menuItem}>
                  {isHidden ? (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isHidden ? "Show publicly" : "Hide from public"}
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsEditing(true);
                  }}
                  className={menuItem}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  className={cn(menuItem, "text-danger hover:bg-danger-soft")}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <StarRating value={rating} size={16} />
        <p className="whitespace-pre-line text-sm leading-relaxed text-fg">&ldquo;{content}&rdquo;</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.space_title && <Badge tone="accent">{item.space_title}</Badge>}
          {isFavorite && (
            <Badge tone="warn">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              Favorite
            </Badge>
          )}
          {isPubliclyEligible ? (
            <Badge tone="success">Public</Badge>
          ) : (
            <Badge tone="neutral">{isHidden ? "Hidden" : "No sharing consent"}</Badge>
          )}
        </div>
        <p className="ml-auto truncate text-xs text-faint" title="Only you can see this email">
          {item.email || "No email"}
          {item.consent_at ? ` · consent ${new Date(item.consent_at).toLocaleDateString()}` : ""}
        </p>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`del-${item.id}`}
        >
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 text-center shadow-pop">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 id={`del-${item.id}`} className="text-base font-semibold text-fg">
                Delete testimonial?
              </h3>
              <p className="text-sm text-muted">
                This is permanent. It will be removed from your inbox, Wall of Love and any embeds.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-1">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-${item.id}`}
        >
          <div className="w-full max-w-lg rounded-xl border border-line bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id={`edit-${item.id}`} className="text-base font-semibold text-fg">
                Edit testimonial
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 p-5">
              <div className="space-y-1.5">
                <label htmlFor={`co-${item.id}`} className="block text-xs font-medium text-fg">
                  Company (optional)
                </label>
                <input
                  id={`co-${item.id}`}
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  maxLength={120}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`rt-${item.id}`} className="block text-xs font-medium text-fg">
                  Rating
                </label>
                <select
                  id={`rt-${item.id}`}
                  value={editRating}
                  onChange={(e) => setEditRating(Number(e.target.value))}
                  className={inputClass}
                >
                  <option value={5}>5 stars</option>
                  <option value={4}>4 stars</option>
                  <option value={3}>3 stars</option>
                  <option value={2}>2 stars</option>
                  <option value={1}>1 star</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`ct-${item.id}`} className="block text-xs font-medium text-fg">
                  Testimonial
                </label>
                <textarea
                  id={`ct-${item.id}`}
                  required
                  rows={5}
                  minLength={10}
                  maxLength={5000}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
