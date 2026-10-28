"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { deleteSpaceAction } from "@/actions/spaces";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

/**
 * Danger zone for a space. Requires typing the space name so a stray click can never
 * delete a space and all of its testimonials.
 */
export default function DeleteSpaceCard({
  spaceId,
  spaceTitle,
  testimonialCount,
}: {
  spaceId: string;
  spaceTitle: string;
  testimonialCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim() === spaceTitle.trim();

  const handleDelete = async () => {
    if (!matches) return;
    setDeleting(true);
    setError(null);
    const res = await deleteSpaceAction(spaceId);
    if (!res.ok) {
      setError(res.error);
      setDeleting(false);
      return;
    }
    router.push("/spaces");
    router.refresh();
  };

  const close = () => {
    setOpen(false);
    setTyped("");
    setError(null);
  };

  return (
    <>
      <Card id="danger-zone" className="border-danger/30">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-danger">Delete this space</h2>
            <p className="mt-1 text-sm text-muted">
              Permanently removes the space, its public pages and widgets, and all {testimonialCount}{" "}
              testimonial{testimonialCount === 1 ? "" : "s"} in it. This cannot be undone.
            </p>
          </div>
          <Button variant="danger" onClick={() => setOpen(true)} className="shrink-0">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete space
          </Button>
        </CardBody>
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-space-title"
          aria-describedby="delete-space-desc"
          onKeyDown={(e) => e.key === "Escape" && !deleting && close()}
        >
          <div className="w-full max-w-md space-y-4 rounded-xl border border-line bg-surface p-6 shadow-pop">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 id="delete-space-title" className="text-base font-semibold text-fg">
                  Delete &ldquo;{spaceTitle}&rdquo;?
                </h3>
                <p id="delete-space-desc" className="mt-1 text-sm text-muted">
                  {testimonialCount} testimonial{testimonialCount === 1 ? "" : "s"}, the collection link, the
                  Wall of Love and every embed for this space will stop working immediately.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-space-name" className="block text-sm font-medium text-fg">
                Type <span className="font-semibold">{spaceTitle}</span> to confirm
              </label>
              <input
                id="confirm-space-name"
                autoFocus
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={close} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={!matches || deleting}>
                {deleting ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
