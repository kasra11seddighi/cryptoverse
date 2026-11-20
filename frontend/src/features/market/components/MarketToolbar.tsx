import { ArrowDown, ArrowUp } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import type { CoinSort, CoinSortKey } from "@/types/market";

/** Columns that can be sorted from the mobile select (desktop sorts from the table headers). */
const MOBILE_SORT_OPTIONS: ReadonlyArray<{ key: CoinSortKey; label: string }> = [
  { key: "rank", label: "Rank" },
  { key: "name", label: "Name" },
  { key: "price", label: "Price" },
  { key: "change24h", label: "24h change" },
  { key: "volume24h", label: "24h volume" },
  { key: "marketCap", label: "Market cap" },
];

interface MarketToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: CoinSort;
  onSortChange: (sort: CoinSort) => void;
}

export function MarketToolbar({ search, onSearchChange, sort, onSortChange }: MarketToolbarProps) {
  const DirectionIcon = sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
      <div className="sm:max-w-sm sm:flex-1">
        <SearchInput
          label="Search cryptocurrencies by name or symbol"
          placeholder="Search by name or symbol"
          value={search}
          onChange={onSearchChange}
        />
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <label htmlFor="market-sort" className="text-sm text-ink-muted">
          Sort by
        </label>
        <select
          id="market-sort"
          value={sort.key}
          onChange={(event) => {
            const option = MOBILE_SORT_OPTIONS.find((item) => item.key === event.target.value);
            if (option) onSortChange({ ...sort, key: option.key });
          }}
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2 text-sm text-ink focus:outline-2 focus:outline-cyan/40"
        >
          {MOBILE_SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            onSortChange({ ...sort, direction: sort.direction === "asc" ? "desc" : "asc" })
          }
          aria-label={sort.direction === "asc" ? "Sorted ascending, switch to descending" : "Sorted descending, switch to ascending"}
          className="flex size-10 items-center justify-center rounded-lg border border-line bg-canvas text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan"
        >
          <DirectionIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
