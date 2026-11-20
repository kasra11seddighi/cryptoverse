import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartTone, TickStyle, TimeSeriesPoint } from "@/types/chart";
import { formatChartTick, formatChartTooltipDate } from "@/utils/format";
import {
  CHART_AXIS_TEXT,
  CHART_BACKGROUND,
  CHART_COLORS,
  CHART_CURSOR,
  CHART_GRID,
} from "./chartColors";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  tone: ChartTone;
  tickStyle: TickStyle;
  /** Show the time of day in the tooltip (intraday ranges). */
  showTime: boolean;
  formatValue: (value: number) => string;
  formatAxisValue: (value: number) => string;
  /** Text alternative describing what the chart shows. */
  ariaLabel: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  showTime: boolean;
  formatValue: (value: number) => string;
}

function isPoint(value: unknown): value is TimeSeriesPoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "timestamp" in value &&
    typeof value.timestamp === "number" &&
    "value" in value &&
    typeof value.value === "number"
  );
}

function ChartTooltip({ active, payload, showTime, formatValue }: ChartTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !isPoint(point)) return null;

  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 shadow-xl shadow-black/40">
      <p className="text-xs text-ink-muted">{formatChartTooltipDate(point.timestamp, showTime)}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{formatValue(point.value)}</p>
    </div>
  );
}

function getYDomain(data: readonly TimeSeriesPoint[]): [number, number] {
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || Math.abs(max) * 0.02 || 1;
  return [min - padding, max + padding];
}

/** Responsive area chart for any value over time. Data and formatting come from the caller. */
export function TimeSeriesChart({
  data,
  tone,
  tickStyle,
  showTime,
  formatValue,
  formatAxisValue,
  ariaLabel,
}: TimeSeriesChartProps) {
  const gradientId = `fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const color = CHART_COLORS[tone];

  return (
    <div role="img" aria-label={ariaLabel} className="size-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) => formatChartTick(value, tickStyle)}
            tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={48}
          />
          <YAxis
            domain={getYDomain(data)}
            tickFormatter={(value: number) => formatAxisValue(value)}
            tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={68}
          />
          <Tooltip
            content={<ChartTooltip showTime={showTime} formatValue={formatValue} />}
            cursor={{ stroke: CHART_CURSOR, strokeDasharray: "3 3" }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: CHART_BACKGROUND, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
