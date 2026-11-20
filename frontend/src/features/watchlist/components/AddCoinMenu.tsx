import { useCallback, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { SearchInput } from "@/components/ui/SearchInput";
import { useCurrency } from "@/hooks/useCurrency";
import { useDismissable } from "@/hooks/useDismissable";
import { useCoins } from "@/features/market/hooks";
import { coinMatchesQuery } from "@/utils/coins";

interface AddCoinMenuProps {
  watchedIds: ReadonlySet<string>;
  onAdd: (coinId: string) => void;
}

const ALL_COINS = { page: 1, pageSize: 100 } as const;

/** Popover listing the coins that are not yet on the watchlist. Stays open so several can be added. */
export function AddCoinMenu({ watchedIds, onAdd }: AddCoinMenuProps) {
  const { format } = useCurrency();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(containerRef, open, close);

  const query = useCoins(ALL_COINS);
  const available = (query.data?.items ?? []).filter((coin) => !watchedIds.has(coin.id));
  const matches = available.filter((coin) => coinMatchesQuery(coin, search));

  return (
    <div ref={containerRef} className="relative">
      <Button aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <Plus className="size-4" aria-hidden="true" />
        Add coin
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Add a coin to your watchlist"
          className="absolute right-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-3 shadow-2xl shadow-black/40"
        >
          <SearchInput label="Search coins to add" placeholder="Search coins" value={search} onChange={setSearch} />

          <div className="mt-2 max-h-72 overflow-y-auto">
            {query.isPending ? (
              <p role="status" className="px-2 py-6 text-center text-sm text-ink-muted">
                Loading coins…
              </p>
            ) : query.isError ? (
              <p role="alert" className="px-2 py-6 text-center text-sm text-loss">
                Coins could not be loaded.
              </p>
            ) : available.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-ink-muted">Every coin is already on your watchlist.</p>
            ) : matches.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-ink-muted">No coins match “{search.trim()}”.</p>
            ) : (
              <ul>
                {matches.map((coin) => (
                  <li key={coin.id}>
                    <button
                      type="button"
                      onClick={() => onAdd(coin.id)}
                      aria-label={`Add ${coin.name} to watchlist`}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-cyan"
                    >
                      <CoinLogo symbol={coin.symbol} color={coin.color} imageUrl={coin.imageUrl} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{coin.name}</span>
                        <span className="block text-xs text-ink-muted">{coin.symbol}</span>
                      </span>
                      <span className="text-sm tabular-nums text-ink-muted">{format(coin.price)}</span>
                      <Plus className="size-4 text-cyan" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
