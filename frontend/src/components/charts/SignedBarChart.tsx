import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_TEXT, CHART_COLORS, CHART_CURSOR, CHART_GRID } from "./chartColors";

export interface SignedBarDatum {
  label: string;
  value: number;
}

interface SignedBarChartProps {
  data: SignedBarDatum[];
  formatValue: (value: number) => string;
  formatAxisValue: (value: number) => string;
  ariaLabel: string;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  formatValue: (value: number) => string;
}

function isDatum(value: unknown): value is SignedBarDatum {
  return (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    typeof value.label === "string" &&
    "value" in value &&
    typeof value.value === "number"
  );
}

function BarTooltip({ active, payload, formatValue }: BarTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !isDatum(datum)) return null;

  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 shadow-xl shadow-black/40">
      <p className="text-xs text-ink-muted">{datum.label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${datum.value < 0 ? "text-loss" : "text-gain"}`}>
        {formatValue(datum.value)}
      </p>
    </div>
  );
}

/** Vertical bars that are green above zero and red below it. */
export function SignedBarChart({ data, formatValue, formatAxisValue, ariaLabel }: SignedBarChartProps) {
  return (
    <div role="img" aria-label={ariaLabel} className="size-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={(value: number) => formatAxisValue(value)}
            tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={68}
          />
          <ReferenceLine y={0} stroke={CHART_CURSOR} />
          <Tooltip content={<BarTooltip formatValue={formatValue} />} cursor={{ fill: CHART_GRID, opacity: 0.4 }} isAnimationActive={false} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {data.map((datum) => (
              <Cell key={datum.label} fill={datum.value < 0 ? CHART_COLORS.negative : CHART_COLORS.positive} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
