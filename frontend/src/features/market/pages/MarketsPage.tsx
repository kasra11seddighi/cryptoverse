import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { PoweredByCoinGecko } from "@/components/ui/PoweredByCoinGecko";
import { useWatchlistToggle } from "@/features/watchlist/hooks";
import { MarketChartPanel } from "../components/MarketChartPanel";
import { MarketSummaryCards } from "../components/MarketSummaryCards";
import { MarketTable } from "../components/MarketTable";
import { MarketToolbar } from "../components/MarketToolbar";
import { useMarketTable } from "../hooks";

const PAGE_SIZE = 10;

export function MarketsPage() {
  const table = useMarketTable(PAGE_SIZE);
  const { watchedIds, toggle } = useWatchlistToggle();
  const { query } = table;
  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Markets"
        description="Explore cryptocurrencies by price, movement and market size."
        actions={<PoweredByCoinGecko />}
      />
      <MarketSummaryCards />
      <MarketChartPanel />

      <Card>
        <MarketToolbar
          search={table.search}
          onSearchChange={table.changeSearch}
          sort={table.sort}
          onSortChange={table.changeSort}
        />
        <MarketTable
          coins={data?.items ?? []}
          watchedIds={watchedIds}
          onToggleWatch={toggle}
          isLoading={query.isPending}
          isRefreshing={query.isPlaceholderData}
          isError={query.isError}
          onRetry={() => void query.refetch()}
          sort={table.sort}
          onSortChange={table.toggleSort}
          searchTerm={table.search.trim()}
          onClearSearch={() => table.changeSearch("")}
          skeletonRows={PAGE_SIZE}
        />
        {data && data.total > 0 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={table.changePage}
            disabled={query.isPlaceholderData}
          />
        )}
      </Card>
    </div>
  );
}
