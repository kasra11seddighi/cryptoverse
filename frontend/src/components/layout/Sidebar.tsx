import { ChevronsLeft, ChevronsRight, FlaskConical } from "lucide-react";
import { Brand } from "./Brand";
import { SidebarNav } from "./SidebarNav";
import { LABEL_CLASSES } from "./sidebarLabels";
import type { LabelMode } from "./sidebarLabels";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Tablet: always an icon rail. Desktop (lg+): full width, collapsible by preference. */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const labelMode: LabelMode = collapsed ? "never" : "lg";
  const ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;

  return (
    <aside
      className={`hidden shrink-0 flex-col gap-6 border-r border-line bg-surface p-3 transition-[width] duration-200 motion-reduce:transition-none md:flex md:w-[72px] ${collapsed ? "" : "lg:w-[248px]"}`}
    >
      <div className={`flex h-10 items-center px-1 ${LABEL_CLASSES[labelMode].row}`}>
        <Brand textClassName={LABEL_CLASSES[labelMode].label} />
      </div>

      <SidebarNav labelMode={labelMode} />

      <div className="space-y-3">
        {!collapsed && (
          <div className="hidden rounded-lg border border-line bg-surface-2 p-3 lg:block">
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <FlaskConical className="size-3.5 text-cyan" aria-hidden="true" />
              Simulation mode
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Portfolio and trades are simulated. No real funds are involved. Market data by CoinGecko.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="hidden h-9 w-full items-center justify-center gap-2 rounded-lg text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan lg:flex"
        >
          <ToggleIcon className="size-4" aria-hidden="true" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
