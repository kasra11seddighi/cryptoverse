import type { TickStyle } from "@/types/chart";
import type { ChartInterval } from "@/types/market";
import type { PortfolioRange } from "@/types/portfolio";

type AnyRange = ChartInterval | PortfolioRange;

const TIME_CONFIG: Record<AnyRange, { tick: TickStyle; showTime: boolean }> = {
  // CoinGecko granularity: 5 minutes for 1 day, hourly for 2-90 days, daily beyond that.
  "24H": { tick: "time", showTime: true },
  "7D": { tick: "day", showTime: true },
  "30D": { tick: "day", showTime: true },
  "1M": { tick: "day", showTime: true },
  "90D": { tick: "day", showTime: true },
  "3M": { tick: "day", showTime: true },
  "1Y": { tick: "month", showTime: false },
  MAX: { tick: "month", showTime: false },
  ALL: { tick: "month", showTime: false },
};

export function getChartTimeConfig(range: AnyRange): { tick: TickStyle; showTime: boolean } {
  return TIME_CONFIG[range];
}

/** Direction of a series from its first to its last point. */
export function periodChange(values: readonly number[]): { change: number; percent: number } | null {
  const first = values[0];
  const last = values[values.length - 1];
  if (first === undefined || last === undefined || first === 0) return null;
  return { change: last - first, percent: ((last - first) / first) * 100 };
}
