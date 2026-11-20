import type { LucideIcon } from "lucide-react";
import { PercentChange } from "./PercentChange";
import { Skeleton } from "./Skeleton";

type Trend = "positive" | "negative" | "neutral";

interface StatCardProps {
  label: string;
  value: string;
  /** Percentage change shown under the value. */
  change?: number | null;
  changeLabel?: string;
  /** Colours the main value (for profit and loss). */
  trend?: Trend;
  icon?: LucideIcon;
  hint?: string;
  loading?: boolean;
  error?: boolean;
}

const VALUE_TONE: Record<Trend, string> = {
  positive: "text-gain",
  negative: "text-loss",
  neutral: "text-ink",
};

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  trend = "neutral",
  icon: Icon,
  hint,
  loading = false,
  error = false,
}: StatCardProps) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-busy={loading}
      className="rounded-xl border border-line bg-surface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">{label}</p>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-cyan">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-ink-muted">Unavailable right now</p>
      ) : (
        <>
          <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${VALUE_TONE[trend]}`}>
            {value}
          </p>
          <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-2 text-xs">
            {change !== undefined && change !== null && <PercentChange value={change} />}
            {changeLabel && change !== undefined && change !== null && (
              <span className="text-ink-muted">{changeLabel}</span>
            )}
            {hint && <span className="text-ink-muted">{hint}</span>}
          </div>
        </>
      )}
    </div>
  );
}
