import { Link, useParams } from "react-router-dom";
import { SearchX, TriangleAlert } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { ApiError } from "@/lib/apiError";
import { TrendingCard } from "@/features/market/components/TrendingCard";
import { useMarketOverview } from "@/features/market/hooks";
import { useWatchlistToggle } from "@/features/watchlist/hooks";
import { AboutCoin } from "../components/AboutCoin";
import { CoinHeader } from "../components/CoinHeader";
import { CoinPeriodChanges } from "../components/CoinPeriodChanges";
import { CoinPriceChart } from "../components/CoinPriceChart";
import { CoinStats } from "../components/CoinStats";
import { YourHolding } from "../components/YourHolding";
import { useCoin } from "../hooks";

export function CoinDetailsPage() {
  const { coinId = "" } = useParams();
  const query = useCoin(coinId);
  const overview = useMarketOverview();
  const { watchedIds, toggle } = useWatchlistToggle();

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading coin" className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-96 w-full xl:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Card>
        <StatePanel
          tone={notFound ? "neutral" : "error"}
          icon={notFound ? SearchX : TriangleAlert}
          title={notFound ? "Cryptocurrency not found" : "Coin details could not be loaded"}
          description={notFound ? `There is no coin matching “${coinId}”.` : "Check your connection and try again."}
          action={
            notFound ? (
              <Link to={PATHS.markets} className="text-sm font-medium text-accent hover:underline">
                Back to markets
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Retry
              </Button>
            )
          }
        />
      </Card>
    );
  }

  const coin = query.data;

  return (
    <div className="space-y-6">
      <CoinHeader coin={coin} watched={watchedIds.has(coin.id)} onToggleWatch={() => toggle(coin.id)} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title={`${coin.name} price`} description="Live prices from CoinGecko" />
            <div className="pt-4">
              <CoinPriceChart coinId={coin.id} coinName={coin.name} showRange />
            </div>
          </Card>
          <CoinPeriodChanges coin={coin} />
          <AboutCoin coin={coin} />
        </div>

        <div className="space-y-6">
          <YourHolding coin={coin} />
          <CoinStats coin={coin} totalMarketCap={overview.data?.totalMarketCap ?? null} />
          <TrendingCard count={5} excludeId={coin.id} />
        </div>
      </div>
    </div>
  );
}
