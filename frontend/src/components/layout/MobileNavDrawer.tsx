import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Brand } from "./Brand";
import { SidebarNav } from "./SidebarNav";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Off-canvas navigation for phones (below md). */
export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="animate-slide-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 border-r border-line bg-surface p-4 shadow-2xl motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <SidebarNav labelMode="always" onNavigate={onClose} />
      </div>
    </div>
  );
}
