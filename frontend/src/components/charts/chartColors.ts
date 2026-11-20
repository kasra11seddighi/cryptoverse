import type { ChartTone } from "@/types/chart";

/** Mirrors the design tokens in index.css (Recharts needs concrete colour values). */
export const CHART_COLORS: Record<ChartTone, string> = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#3b82f6",
};

export const CHART_GRID = "#1f2a40";
export const CHART_AXIS_TEXT = "#8a96ad";
export const CHART_CURSOR = "#3a4a68";
export const CHART_BACKGROUND = "#070b14";
