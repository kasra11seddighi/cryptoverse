import { TrendingDown, TrendingUp } from "lucide-react";
import { formatPercent } from "@/utils/format";

interface PercentChangeProps {
  /** null/undefined means the value is not available; it renders as an em dash. */
  value: number | null | undefined;
  showIcon?: boolean;
}

/** Green/red market movement. Sign and icon carry the meaning too, not colour alone. */
export function PercentChange({ value, showIcon = true }: PercentChangeProps) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return <span className="text-ink-muted">—</span>;
  }

  const isFlat = Math.abs(value) < 0.005;
  const tone = isFlat ? "text-ink-muted" : value > 0 ? "text-gain" : "text-loss";
  const Icon = value >= 0 ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${tone}`}>
      {showIcon && !isFlat && <Icon className="size-3.5" aria-hidden="true" />}
      {formatPercent(value)}
    </span>
  );
}
