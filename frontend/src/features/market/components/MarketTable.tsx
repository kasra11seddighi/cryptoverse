import { Link } from "react-router-dom";
import { SearchX, Star, TriangleAlert } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/Button";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { PercentChange } from "@/components/ui/PercentChange";
import { Skeleton } from "@/components/ui/Skeleton";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCurrency } from "@/hooks/useCurrency";
import type { Coin, CoinSort, CoinSortKey } from "@/types/market";

interface MarketTableProps {
  coins: readonly Coin[];
  watchedIds: ReadonlySet<string>;
  onToggleWatch: (coinId: string) => void;
  /** First load, with nothing to show yet. */
  isLoading: boolean;
  /** Refetching while the previous rows are still displayed. */
  isRefreshing?: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Without sort props the headers are plain labels (used by the compact dashboard list). */
  sort?: CoinSort;
  onSortChange?: (key: CoinSortKey) => void;
  searchTerm?: string;
  onClearSearch?: () => void;
  /** Hides the volume column. */
  compact?: boolean;
  skeletonRows?: number;
}

export function MarketTable({
  coins,
  watchedIds,
  onToggleWatch,
  isLoading,
  isRefreshing = false,
  isError,
  onRetry,
  sort,
  onSortChange,
  searchTerm = "",
  onClearSearch,
  compact = false,
  skeletonRows = 8,
}: MarketTableProps) {
  const { format, formatCompact } = useCurrency();

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading market data" className="space-y-1 p-4 sm:px-5">
        {Array.from({ length: skeletonRows }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError && coins.length === 0) {
    return (
      <StatePanel
        tone="error"
        icon={TriangleAlert}
        title="Market data could not be loaded"
        description="Check your connection and try again."
        action={
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        }
      />
    );
  }

  if (coins.length === 0) {
    return (
      <StatePanel
        icon={SearchX}
        title={searchTerm ? `No coins match “${searchTerm}”` : "No cryptocurrencies to show"}
        description={searchTerm ? "Try a different name or symbol." : undefined}
        action={
          searchTerm && onClearSearch ? (
            <Button variant="secondary" onClick={onClearSearch}>
              Clear search
            </Button>
          ) : undefined
        }
      />
    );
  }

  const headerProps = { sort, onSortChange };

  return (
    <div className={isRefreshing ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Cryptocurrency prices, 24-hour change, volume and market capitalisation</caption>
          <thead>
            <tr className="text-xs text-ink-muted">
              <SortableHeader label="#" sortKey="rank" {...headerProps} className="w-14 pl-4 sm:pl-5" />
              <SortableHeader label="Name" sortKey="name" {...headerProps} />
              <SortableHeader label="Price" sortKey="price" align="right" {...headerProps} />
              <SortableHeader label="24h" sortKey="change24h" align="right" {...headerProps} />
              {!compact && (
                <SortableHeader label="24h volume" sortKey="volume24h" align="right" {...headerProps} className="hidden lg:table-cell" />
              )}
              <SortableHeader label="Market cap" sortKey="marketCap" align="right" {...headerProps} />
              <th scope="col" className="w-14 pr-4 sm:pr-5">
                <span className="sr-only">Watchlist</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => (
              <tr key={coin.id} className="border-t border-line transition-colors hover:bg-surface-2/40">
                <td className="py-3 pl-4 tabular-nums text-ink-muted sm:pl-5">{coin.rank ?? "—"}</td>
                <td className="py-3 pr-4">
                  <Link
                    to={PATHS.coin(coin.id)}
                    className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-cyan"
                  >
                    <CoinLogo symbol={coin.symbol} color={coin.color} imageUrl={coin.imageUrl} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{coin.name}</span>
                      <span className="block text-xs text-ink-muted">{coin.symbol}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{format(coin.price)}</td>
                <td className="px-4 py-3 text-right">
                  <PercentChange value={coin.priceChange["24H"]} />
                </td>
                {!compact && (
                  <td className="hidden px-4 py-3 text-right tabular-nums text-ink-muted lg:table-cell">
                    {formatCompact(coin.volume24h)}
                  </td>
                )}
                <td className="px-4 py-3 text-right tabular-nums text-ink-muted">{formatCompact(coin.marketCap)}</td>
                <td className="py-3 pr-4 text-right sm:pr-5">
                  <WatchButton coin={coin} watched={watchedIds.has(coin.id)} onToggle={onToggleWatch} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden" aria-label="Cryptocurrencies">
        {coins.map((coin) => (
          <li key={coin.id} className="flex items-center gap-3 px-4 py-3">
            <CoinLogo symbol={coin.symbol} color={coin.color} imageUrl={coin.imageUrl} />
            <Link
              to={PATHS.coin(coin.id)}
              className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-cyan"
            >
              <span className="block truncate text-sm font-medium">{coin.name}</span>
              <span className="block truncate text-xs text-ink-muted">
                {coin.rank !== null ? `#${coin.rank} · ` : ""}{coin.symbol} · {formatCompact(coin.marketCap)}
              </span>
            </Link>
            <div className="text-right">
              <p className="text-sm tabular-nums">{format(coin.price)}</p>
              <p className="text-xs">
                <PercentChange value={coin.priceChange["24H"]} />
              </p>
            </div>
            <WatchButton coin={coin} watched={watchedIds.has(coin.id)} onToggle={onToggleWatch} />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface WatchButtonProps {
  coin: Coin;
  watched: boolean;
  onToggle: (coinId: string) => void;
}

function WatchButton({ coin, watched, onToggle }: WatchButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={watched}
      aria-label={watched ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`}
      onClick={() => onToggle(coin.id)}
      className={`rounded-lg p-2 transition-colors focus-visible:outline-2 focus-visible:outline-cyan ${watched ? "text-cyan" : "text-ink-muted hover:text-ink"}`}
    >
      <Star className={`size-4 ${watched ? "fill-current" : ""}`} aria-hidden="true" />
    </button>
  );
}
