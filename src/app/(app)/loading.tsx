export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center" role="status" aria-live="polite">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="mt-3 text-sm text-muted">Loading...</p>
    </div>
  );
}
