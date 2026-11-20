import { useMemo, useState } from "react";
import { Star, TriangleAlert } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PoweredByCoinGecko } from "@/components/ui/PoweredByCoinGecko";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { MarketTable } from "@/features/market/components/MarketTable";
import { MarketToolbar } from "@/features/market/components/MarketToolbar";
import { useCoinsByIds } from "@/features/market/hooks";
import { coinMatchesQuery, nextSort, sortCoins } from "@/utils/coins";
import { AddCoinMenu } from "../components/AddCoinMenu";
import { useWatchlistToggle } from "../hooks";

export function WatchlistPage() {
  const { coinIds, watchedIds, toggle, add, sort, setSort, isLoading, isError, refetch } = useWatchlistToggle();
  const [search, setSearch] = useState("");

  const query = useCoinsByIds(coinIds);
  const visible = useMemo(
    () => sortCoins((query.data ?? []).filter((coin) => coinMatchesQuery(coin, search)), sort),
    [query.data, search, sort],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlist"
        description={
          coinIds.length > 0
            ? `${coinIds.length} ${coinIds.length === 1 ? "coin" : "coins"} you are following.`
            : "Follow coins to keep an eye on their prices."
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <PoweredByCoinGecko />
            <AddCoinMenu watchedIds={watchedIds} onAdd={add} />
          </div>
        }
      />

      <Card>
        {isLoading ? (
          <div role="status" aria-label="Loading watchlist" className="space-y-2 p-4 sm:p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <StatePanel
            tone="error"
            icon={TriangleAlert}
            title="Watchlist unavailable"
            description="Your watchlist could not be loaded."
            action={
              <Button variant="secondary" onClick={refetch}>
                Retry
              </Button>
            }
          />
        ) : coinIds.length === 0 ? (
          <StatePanel
            icon={Star}
            title="Your watchlist is empty"
            description="Add coins with the button above, or star them in the markets table."
            action={<ButtonLink to={PATHS.markets}>Browse markets</ButtonLink>}
          />
        ) : (
          <>
            <MarketToolbar search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} />
            <MarketTable
              coins={visible}
              watchedIds={watchedIds}
              onToggleWatch={toggle}
              isLoading={query.isPending}
              isError={query.isError}
              onRetry={() => void query.refetch()}
              sort={sort}
              onSortChange={(key) => setSort(nextSort(sort, key))}
              searchTerm={search.trim()}
              onClearSearch={() => setSearch("")}
              skeletonRows={Math.min(coinIds.length, 6)}
            />
          </>
        )}
      </Card>
    </div>
  );
}
