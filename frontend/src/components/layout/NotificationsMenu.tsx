import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { useDismissable } from "@/hooks/useDismissable";

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(containerRef, open, close);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex size-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan"
      >
        <Bell className="size-[18px]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-2xl shadow-black/40"
        >
          <div className="border-b border-line px-4 py-3 text-sm font-medium">Notifications</div>
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="mt-1 text-xs text-ink-muted">
              Price alerts and portfolio updates will appear here.
            </p>
          </div>
          <div className="border-t border-line px-4 py-2.5">
            <Link
              to={PATHS.settings}
              onClick={close}
              className="text-xs font-medium text-accent hover:underline"
            >
              Notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
