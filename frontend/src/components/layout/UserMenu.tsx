import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, LoaderCircle, LogOut, Settings } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { useLogoutMutation } from "@/features/auth/hooks";
import { useDismissable } from "@/hooks/useDismissable";
import { useAuthStore } from "@/stores/auth.store";

function getInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : label.slice(0, 2);
  return letters.toUpperCase();
}

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan";

export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogoutMutation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(containerRef, open, close);

  const displayName = user?.name ?? user?.email ?? "Account";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-10 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-cyan"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-cyan ring-1 ring-accent/30">
          {getInitials(displayName)}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium md:inline">{displayName}</span>
        <ChevronDown className="hidden size-4 text-ink-muted md:block" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-2xl shadow-black/40"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {user && <p className="truncate text-xs text-ink-muted">{user.email}</p>}
          </div>
          <div className="my-1 border-t border-line" />
          <Link to={PATHS.settings} role="menuitem" onClick={close} className={ITEM_CLASS}>
            <Settings className="size-4" aria-hidden="true" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            className={`${ITEM_CLASS} disabled:opacity-60`}
          >
            {logout.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-4" aria-hidden="true" />
            )}
            {logout.isPending ? "Signing out" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
