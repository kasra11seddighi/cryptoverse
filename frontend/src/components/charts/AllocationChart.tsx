import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AllocationSlice } from "@/types/portfolio";
import { formatPercent } from "@/utils/format";

interface AllocationChartProps {
  slices: AllocationSlice[];
  formatValue: (value: number) => string;
  /** Shown in the middle of the donut. */
  centerLabel: string;
  centerValue: string;
}

interface SliceTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  formatValue: (value: number) => string;
}

function isSlice(value: unknown): value is AllocationSlice {
  return (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    typeof value.label === "string" &&
    "value" in value &&
    typeof value.value === "number" &&
    "percent" in value &&
    typeof value.percent === "number"
  );
}

function SliceTooltip({ active, payload, formatValue }: SliceTooltipProps) {
  const slice = payload?.[0]?.payload;
  if (!active || !isSlice(slice)) return null;

  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 shadow-xl shadow-black/40">
      <p className="text-xs text-ink-muted">{slice.label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatValue(slice.value)}</p>
      <p className="text-xs tabular-nums text-ink-muted">{formatPercent(slice.percent, { showSign: false })}</p>
    </div>
  );
}

/** Donut chart with a text legend, so the breakdown is readable without relying on colour. */
export function AllocationChart({ slices, formatValue, centerLabel, centerValue }: AllocationChartProps) {
  const summary = slices
    .map((slice) => `${slice.label} ${formatPercent(slice.percent, { showSign: false })}`)
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div role="img" aria-label={`Asset allocation: ${summary}`} className="relative size-48 shrink-0 sm:size-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="64%"
              outerRadius="100%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.id} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip formatValue={formatValue} />} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-ink-muted">{centerLabel}</span>
          <span className="text-base font-semibold tabular-nums">{centerValue}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.id} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="min-w-0 flex-1 truncate">{slice.label}</span>
            <span className="tabular-nums text-ink-muted">{formatPercent(slice.percent, { showSign: false })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
