export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

/** Colour semantics of a chart: positive (green), negative (red) or neutral (blue). */
export type ChartTone = "positive" | "negative" | "neutral";

/** How x-axis labels are written for a given time span. */
export type TickStyle = "time" | "day" | "month";
