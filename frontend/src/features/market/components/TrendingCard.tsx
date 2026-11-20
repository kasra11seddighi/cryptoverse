import { Link } from "react-router-dom";
import { Flame, TriangleAlert } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { useTrendingCoins } from "../hooks";

interface TrendingCardProps {
  count?: number;
  /** Coin ids to leave out, for example the coin whose page this card is on. */
  excludeId?: string;
}

/** Coins people are searching for right now (CoinGecko trending). */
export function TrendingCard({ count = 5, excludeId }: TrendingCardProps) {
  const query = useTrendingCoins(count + 1);
  const coins = (query.data ?? []).filter((coin) => coin.id !== excludeId).slice(0, count);

  return (
    <Card>
      <CardHeader title="Trending now" description="Most searched on CoinGecko" />
      {query.isPending ? (
        <div role="status" aria-label="Loading trending coins" className="space-y-2 p-4 sm:px-5">
          {Array.from({ length: Math.min(count, 4) }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <StatePanel
          tone="error"
          icon={TriangleAlert}
          title="Trending coins unavailable"
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : coins.length === 0 ? (
        <StatePanel icon={Flame} title="Nothing is trending right now" />
      ) : (
        <ul className="mt-2 divide-y divide-line pb-2">
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
                <span className="text-xs tabular-nums text-ink-muted">{coin.rank !== null ? `Rank #${coin.rank}` : "Unranked"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
