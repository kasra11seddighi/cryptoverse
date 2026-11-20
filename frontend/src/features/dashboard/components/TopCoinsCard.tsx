import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Card, CardHeader } from "@/components/ui/Card";
import { MarketTable } from "@/features/market/components/MarketTable";
import { useCoins } from "@/features/market/hooks";
import { useWatchlistToggle } from "@/features/watchlist/hooks";

const TOP_COUNT = 5;

export function TopCoinsCard() {
  const query = useCoins({ page: 1, pageSize: TOP_COUNT });
  const { watchedIds, toggle } = useWatchlistToggle();

  return (
    <Card>
      <CardHeader
        title="Top cryptocurrencies"
        description="Ranked by market capitalisation"
        actions={
          <Link
            to={PATHS.markets}
            className="inline-flex items-center gap-0.5 text-sm text-accent hover:underline focus-visible:outline-2 focus-visible:outline-cyan"
          >
            View all
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      <div className="mt-3">
        <MarketTable
          compact
          skeletonRows={TOP_COUNT}
          coins={query.data?.items ?? []}
          watchedIds={watchedIds}
          onToggleWatch={toggle}
          isLoading={query.isPending}
          isError={query.isError}
          onRetry={() => void query.refetch()}
        />
      </div>
    </Card>
  );
}
