import type { RefObject } from "react";
import { Menu } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { MarketStatus } from "./MarketStatus";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  onOpenNav: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

export function Header({ onOpenNav, menuButtonRef }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-canvas/90 px-3 backdrop-blur sm:gap-3 sm:px-4 md:px-6">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan md:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <MarketStatus />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
