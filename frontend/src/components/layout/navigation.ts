import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  ChartColumn,
  LayoutDashboard,
  Settings,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PATHS } from "@/app/router/paths";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Match the exact path only (needed for "/"). */
  end?: boolean;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Dashboard", to: PATHS.overview, icon: LayoutDashboard, end: true },
  { label: "Markets", to: PATHS.markets, icon: TrendingUp },
  { label: "Watchlist", to: PATHS.watchlist, icon: Star },
  { label: "Portfolio", to: PATHS.portfolio, icon: Wallet },
  { label: "Transactions", to: PATHS.transactions, icon: ArrowLeftRight },
  { label: "Analytics", to: PATHS.analytics, icon: ChartColumn },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { label: "Settings", to: PATHS.settings, icon: Settings },
];
