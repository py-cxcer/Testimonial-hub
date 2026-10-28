"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors on the client without secrets.
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-line bg-surface p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-fg">Something went wrong</h2>
        <p className="text-sm text-muted">An error occurred while loading this section.</p>
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}
