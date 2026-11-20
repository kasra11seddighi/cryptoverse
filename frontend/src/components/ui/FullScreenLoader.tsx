import { LoaderCircle } from "lucide-react";

export function FullScreenLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center gap-3 text-ink-muted"
    >
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}
