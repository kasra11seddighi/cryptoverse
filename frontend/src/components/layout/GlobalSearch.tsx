import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { PercentChange } from "@/components/ui/PercentChange";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDismissable } from "@/hooks/useDismissable";
import { queryKeys } from "@/lib/queryKeys";
import { marketService } from "@/services";
import { useCurrency } from "@/hooks/useCurrency";
import type { CoinSearchResult } from "@/types/market";

export function GlobalSearch() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const listId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 200);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(containerRef, open, close);

  const search = useQuery({
    queryKey: queryKeys.market.search(debounced),
    queryFn: () => marketService.searchCoins(debounced),
    enabled: debounced !== "",
  });

  const results: CoinSearchResult[] = trimmed === debounced ? (search.data ?? []) : [];
  const isLoading = trimmed !== "" && (trimmed !== debounced || search.isFetching);
  const highlighted = Math.min(activeIndex, Math.max(results.length - 1, 0));
  const showPanel = open && trimmed !== "";

  // "/" focuses the search from anywhere, like most financial terminals.
  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function select(coin: CoinSearchResult) {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    void navigate(PATHS.coin(coin.id));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((highlighted + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((highlighted - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      const coin = results[highlighted];
      if (coin) {
        event.preventDefault();
        select(coin);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const activeOptionId = results[highlighted] ? `${listId}-${results[highlighted].id}` : undefined;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search cryptocurrencies"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search coins…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-10 text-sm text-ink placeholder:text-ink-muted/70 focus:border-cyan/60 focus:outline-2 focus:outline-offset-0 focus:outline-cyan/30 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[0.7rem] text-ink-muted lg:block">
        /
      </kbd>

      {showPanel && (
        <div className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/40">
          {isLoading ? (
            <p role="status" className="px-4 py-6 text-center text-sm text-ink-muted">
              Searching…
            </p>
          ) : search.isError ? (
            <p role="alert" className="px-4 py-6 text-center text-sm text-loss">
              Search failed. Try again.
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              No coins match “{trimmed}”.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search results" className="max-h-80 overflow-y-auto p-1.5">
              {results.map((coin, index) => (
                <li
                  key={coin.id}
                  id={`${listId}-${coin.id}`}
                  role="option"
                  aria-selected={index === highlighted}
                  onMouseEnter={() => setActiveIndex(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => select(coin)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${index === highlighted ? "bg-surface-2" : ""}`}
                >
                  <CoinLogo symbol={coin.symbol} color={coin.color} imageUrl={coin.imageUrl} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{coin.name}</p>
                    <p className="text-xs text-ink-muted">{coin.symbol}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular-nums">{format(coin.price)}</p>
                    <p className="text-xs">
                      <PercentChange value={coin.change24h} showIcon={false} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
