import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PercentChange } from "@/components/ui/PercentChange";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCurrency } from "@/hooks/useCurrency";
import { formatPercent } from "@/utils/format";
import { useMarketOverview } from "../hooks";

export function MarketOverviewCard() {
  const { formatCompact } = useCurrency();
  const query = useMarketOverview();
  const overview = query.data;
  const dominance = overview?.btcDominance ?? null;
  const breadth = overview?.breadth ?? null;

  return (
    <Card className="flex flex-col">
      <CardHeader title="Market overview" description="Global cryptocurrency market" />

      {query.isPending ? (
        <div role="status" aria-label="Loading market overview" className="space-y-4 p-5">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : query.isError || !overview ? (
        <StatePanel
          tone="error"
          icon={TriangleAlert}
          title="Market overview unavailable"
          description="Market data could not be loaded. Nothing is shown rather than guessed values."
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <div className="space-y-5 p-4 sm:p-5">
          <div>
            <p className="text-sm text-ink-muted">Total market cap</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCompact(overview.totalMarketCap)}
              </span>
              <span className="text-sm">
                <PercentChange value={overview.marketCapChange24h} />
              </span>
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">24h volume</dt>
              <dd className="tabular-nums">{formatCompact(overview.totalVolume24h)}</dd>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">Bitcoin dominance</dt>
                <dd className="tabular-nums">{dominance === null ? "—" : formatPercent(dominance, { showSign: false })}</dd>
              </div>
              {dominance !== null && (
                <div
                  role="progressbar"
                  aria-label="Bitcoin dominance"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(dominance)}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
                >
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, dominance))}%` }} />
                </div>
              )}
            </div>
            {overview.activeCryptocurrencies !== null && (
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">Active cryptocurrencies</dt>
                <dd className="tabular-nums">{new Intl.NumberFormat("en-US").format(overview.activeCryptocurrencies)}</dd>
              </div>
            )}
          </dl>

          {breadth && (
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">24h breadth (top {breadth.sampleSize})</span>
                <span className="tabular-nums">
                  <span className="text-gain">{breadth.gainers} up</span>
                  <span className="text-ink-muted"> · </span>
                  <span className="text-loss">{breadth.losers} down</span>
                </span>
              </div>
              <div
                role="img"
                aria-label={`${breadth.gainers} coins up and ${breadth.losers} down in the last 24 hours`}
                className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-2"
              >
                <div className="bg-gain" style={{ flexGrow: breadth.gainers }} />
                <div className="bg-loss" style={{ flexGrow: breadth.losers }} />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
