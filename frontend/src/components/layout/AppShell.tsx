import { Suspense, useCallback, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePreferencesStore } from "@/stores/preferences.store";
import { Header } from "./Header";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { Sidebar } from "./Sidebar";

/** Authenticated application frame: sidebar, header and the routed page. */
export function AppShell() {
  const collapsed = usePreferencesStore((state) => state.sidebarCollapsed);
  const toggleSidebar = usePreferencesStore((state) => state.toggleSidebar);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <button
        type="button"
        onClick={() => mainRef.current?.focus()}
        className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </button>

      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <MobileNavDrawer open={mobileNavOpen} onClose={closeMobileNav} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenNav={() => setMobileNavOpen(true)} menuButtonRef={menuButtonRef} />
        {/* `relative` matters: without it, sr-only (position: absolute) descendants anchor to the
            page instead of this scroll container and make the document itself scrollable. */}
        <main ref={mainRef} tabIndex={-1} className="relative flex-1 overflow-y-auto focus:outline-none">
          <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
