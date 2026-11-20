import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { queryKeys } from "@/lib/queryKeys";
import { priceRefresh } from "@/lib/refresh";
import { marketService } from "@/services";
import type { CoinListParams, CoinSort, CoinSortKey } from "@/types/market";
import { nextSort } from "@/utils/coins";

export function useCoins(params: CoinListParams) {
  return useQuery({
    queryKey: queryKeys.market.coins(params),
    queryFn: () => marketService.getCoins(params),
    placeholderData: keepPreviousData,
    ...priceRefresh,
  });
}

export function useCoinsByIds(ids: readonly string[]) {
  return useQuery({
    queryKey: queryKeys.market.coinsByIds(ids),
    queryFn: () => marketService.getCoinsByIds(ids),
    enabled: ids.length > 0,
    ...priceRefresh,
  });
}

export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.market.overview,
    queryFn: () => marketService.getMarketOverview(),
    ...priceRefresh,
  });
}

/** Search, sort and pagination state for the market table, plus the matching query. */
export function useMarketTable(pageSize: number) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CoinSort>({ key: "rank", direction: "asc" });
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const params = useMemo<CoinListParams>(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      sortBy: sort.key,
      sortDirection: sort.direction,
    }),
    [page, pageSize, debouncedSearch, sort],
  );
  const query = useCoins(params);

  return {
    search,
    sort,
    query,
    changeSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    toggleSort: (key: CoinSortKey) => {
      setSort((current) => nextSort(current, key));
      setPage(1);
    },
    changeSort: (next: CoinSort) => {
      setSort(next);
      setPage(1);
    },
    changePage: setPage,
  };
}

export function useTrendingCoins(limit: number) {
  return useQuery({
    queryKey: queryKeys.market.trending(limit),
    queryFn: () => marketService.getTrendingCoins(limit),
  });
}
