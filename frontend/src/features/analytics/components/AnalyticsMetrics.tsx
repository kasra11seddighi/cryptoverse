import { Banknote, Percent, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { useCurrency } from "@/hooks/useCurrency";
import { ValuationNotice } from "@/features/portfolio/components/ValuationNotice";
import { usePortfolioDetails, usePortfolioSummary } from "@/features/portfolio/hooks";
import { formatPercent } from "@/utils/format";

type Trend = "positive" | "negative" | "neutral";

function trendOf(value: number | null): Trend {
  if (value === null) return "neutral";
  return Math.abs(value) < 0.005 ? "neutral" : value > 0 ? "positive" : "negative";
}

export function AnalyticsMetrics() {
  const { formatSigned } = useCurrency();
  const summary = usePortfolioSummary();
  const details = usePortfolioDetails();

  // With a missing price the unrealised total and the cash share would be partial, so they are not shown.
  const complete = details.data?.valuation.complete ?? true;
  const unrealized = complete ? (details.data?.breakdown.reduce((sum, row) => sum + (row.unrealized ?? 0), 0) ?? 0) : null;
  const realized = details.data?.breakdown.reduce((sum, row) => sum + row.realized, 0) ?? 0;
  const cashShare = complete ? (details.data?.allocation.find((slice) => slice.id === "cash")?.percent ?? 0) : null;
  const unavailableHint = "price unavailable for some assets";
  const returnPercent = summary.data?.profitLossPercent ?? null;

  const summaryState = { loading: summary.isPending, error: summary.isError && !summary.data };
  const detailsState = { loading: details.isPending, error: details.isError && !details.data };

  return (
    <div className="space-y-3">
      <ValuationNotice valuation={summary.data?.valuation} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total return"
          icon={Percent}
          value={summary.data ? (returnPercent === null ? "—" : formatPercent(returnPercent)) : ""}
          trend={trendOf(returnPercent)}
          hint={summary.data ? (summary.data.profitLoss === null ? unavailableHint : `${formatSigned(summary.data.profitLoss)} since start`) : undefined}
          {...summaryState}
        />
        <StatCard
          label="Unrealised P/L"
          icon={TrendingUp}
          value={formatSigned(unrealized)}
          trend={trendOf(unrealized)}
          hint={unrealized === null ? unavailableHint : "open positions"}
          {...detailsState}
        />
        <StatCard
          label="Realised P/L"
          icon={Banknote}
          value={formatSigned(realized)}
          trend={trendOf(realized)}
          hint="closed by sells"
          {...detailsState}
        />
        <StatCard
          label="Cash share"
          icon={Wallet}
          value={cashShare === null ? "—" : formatPercent(cashShare, { showSign: false })}
          hint={cashShare === null ? unavailableHint : "of total value"}
          {...detailsState}
        />
      </div>
    </div>
  );
}
