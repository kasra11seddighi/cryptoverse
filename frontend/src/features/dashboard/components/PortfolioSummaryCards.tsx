import { Activity, CircleDollarSign, Layers, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { useCurrency } from "@/hooks/useCurrency";
import { ValuationNotice } from "@/features/portfolio/components/ValuationNotice";
import { usePortfolioSummary } from "@/features/portfolio/hooks";

type Trend = "positive" | "negative" | "neutral";

function trendOf(value: number | null): Trend {
  if (value === null) return "neutral";
  if (Math.abs(value) < 0.005) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export function PortfolioSummaryCards() {
  const { format, formatSigned } = useCurrency();
  const { data, isPending, isError } = usePortfolioSummary();
  const state = { loading: isPending, error: isError && !data };

  const missing = data && !data.valuation.complete ? `Price unavailable for ${data.valuation.missingSymbols.join(", ")}` : undefined;

  return (
    <div className="space-y-3">
      <ValuationNotice valuation={data?.valuation} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total portfolio value"
          icon={Wallet}
          value={data ? format(data.totalValue) : ""}
          hint={data ? (missing ?? `${format(data.cashBalance)} in cash`) : undefined}
          {...state}
        />
        <StatCard
          label="Total profit / loss"
          icon={CircleDollarSign}
          value={data ? formatSigned(data.profitLoss) : ""}
          trend={data ? trendOf(data.profitLoss) : "neutral"}
          change={data?.profitLossPercent}
          changeLabel="since start"
          hint={data && data.profitLoss === null ? "Unavailable without all prices" : undefined}
          {...state}
        />
        <StatCard
          label="24h change"
          icon={Activity}
          value={data ? formatSigned(data.change24h) : ""}
          trend={data ? trendOf(data.change24h) : "neutral"}
          change={data?.change24hPercent}
          changeLabel="vs 24h ago"
          hint={data && data.change24h === null ? "Unavailable: missing price or 24h data" : undefined}
          {...state}
        />
        <StatCard
          label="Assets"
          icon={Layers}
          value={data ? String(data.assetCount) : ""}
          hint={data ? (data.holdingsValue === null ? "Value unavailable" : `${format(data.holdingsValue)} invested`) : undefined}
          {...state}
        />
      </div>
    </div>
  );
}
