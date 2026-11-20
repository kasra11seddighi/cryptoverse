import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { queryKeys } from "@/lib/queryKeys";
import { portfolioService } from "@/services";
import type { TransactionQuery, TransactionTotals } from "@/types/portfolio";
import { DEFAULT_FILTERS, DEFAULT_SORT, nextTransactionSort } from "./query";
import type { TransactionFilters, TransactionSortKey } from "./query";

const PAGE_SIZE = 10;
const NO_TOTALS: TransactionTotals = { completedCount: 0, bought: 0, sold: 0, realizedPnl: 0 };

/** Filter, sort and pagination state for the transactions page. Filtering, sorting and paging happen on the server. */
export function useTransactionsView() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search.trim(), 300);

  const params = useMemo<TransactionQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      side: filters.side,
      status: filters.status,
      sortBy: sort.key,
      sortDirection: sort.direction,
    }),
    [page, debouncedSearch, filters.side, filters.status, sort],
  );

  const query = useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => portfolioService.listTransactions(params),
    placeholderData: keepPreviousData,
  });

  const isFiltered = filters.search.trim() !== "" || filters.side !== "all" || filters.status !== "all";
  const result = query.data;

  return {
    query,
    result,
    totals: result?.totals ?? NO_TOTALS,
    filters,
    sort,
    isFiltered,
    /** No transaction exists at all (not merely none that match the filters). */
    isEmpty: result !== undefined && result.total === 0 && !isFiltered,
    changeFilters: (patch: Partial<TransactionFilters>) => {
      setFilters((current) => ({ ...current, ...patch }));
      setPage(1);
    },
    clearFilters: () => {
      setFilters(DEFAULT_FILTERS);
      setPage(1);
    },
    toggleSort: (key: TransactionSortKey) => {
      setSort((current) => nextTransactionSort(current, key));
      setPage(1);
    },
    changePage: setPage,
  };
}
