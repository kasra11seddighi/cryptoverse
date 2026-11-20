import { Link } from "react-router-dom";
import { ArrowUpRight, Star, TriangleAlert } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { PercentChange } from "@/components/ui/PercentChange";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCurrency } from "@/hooks/useCurrency";
import { useCoinsByIds } from "@/features/market/hooks";
import { useWatchlistToggle } from "@/features/watchlist/hooks";

const PREVIEW_COUNT = 6;

export function WatchlistPreview() {
  const { format } = useCurrency();
  const { coinIds } = useWatchlistToggle();
  const previewIds = coinIds.slice(0, PREVIEW_COUNT);
  const query = useCoinsByIds(previewIds);
  const coins = query.data ?? [];

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Watchlist"
        description={coinIds.length > 0 ? `${coinIds.length} saved ${coinIds.length === 1 ? "coin" : "coins"}` : undefined}
        actions={
          <Link
            to={PATHS.watchlist}
            className="inline-flex items-center gap-0.5 text-sm text-accent hover:underline focus-visible:outline-2 focus-visible:outline-cyan"
          >
            Open
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />

      <div className="mt-2 flex-1">
        {coinIds.length === 0 ? (
          <StatePanel
            icon={Star}
            title="Your watchlist is empty"
            description="Star a coin in the markets table to follow it here."
            action={
              <Link to={PATHS.markets} className="text-sm font-medium text-accent hover:underline">
                Browse markets
              </Link>
            }
          />
        ) : query.isPending ? (
          <div role="status" aria-label="Loading watchlist" className="space-y-2 p-4 sm:px-5">
            {Array.from({ length: Math.min(previewIds.length, PREVIEW_COUNT) }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <StatePanel
            tone="error"
            icon={TriangleAlert}
            title="Watchlist unavailable"
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line pb-2">
            {coins.map((coin) => (
              <li key={coin.id}>
                <Link
                  to={PATHS.coin(coin.id)}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/40 focus-visible:outline-2 focus-visible:outline-cyan sm:px-5"
                >
                  <CoinLogo symbol={coin.symbol} color={coin.color} imageUrl={coin.imageUrl} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{coin.name}</span>
                    <span className="block text-xs text-ink-muted">{coin.symbol}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm tabular-nums">{format(coin.price)}</span>
                    <span className="block text-xs">
                      <PercentChange value={coin.priceChange["24H"]} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
