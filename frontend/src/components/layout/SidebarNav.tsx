import { NavLink } from "react-router-dom";
import { PRIMARY_NAV, SECONDARY_NAV } from "./navigation";
import { LABEL_CLASSES } from "./sidebarLabels";
import type { LabelMode } from "./sidebarLabels";
import type { NavItem } from "./navigation";

interface SidebarNavProps {
  labelMode: LabelMode;
  onNavigate?: () => void;
}

export function SidebarNav({ labelMode, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col justify-between gap-6 overflow-y-auto">
      <NavGroup items={PRIMARY_NAV} labelMode={labelMode} onNavigate={onNavigate} />
      <NavGroup items={SECONDARY_NAV} labelMode={labelMode} onNavigate={onNavigate} />
    </nav>
  );
}

interface NavGroupProps extends SidebarNavProps {
  items: readonly NavItem[];
}

function NavGroup({ items, labelMode, onNavigate }: NavGroupProps) {
  const classes = LABEL_CLASSES[labelMode];

  return (
    <ul className="space-y-1">
      {items.map(({ label, to, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            title={labelMode === "always" ? undefined : label}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan ${classes.row} ${isActive ? "bg-accent/10 text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink"}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan"
                  />
                )}
                <Icon
                  className={`size-[18px] shrink-0 ${isActive ? "text-cyan" : ""}`}
                  aria-hidden="true"
                />
                <span className={classes.label}>{label}</span>
                {labelMode === "never" && <span className="sr-only">{label}</span>}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
