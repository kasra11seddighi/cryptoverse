import type { Sort } from "@/types/common";
import type { TradeSide, TransactionSortKey, TransactionStatus } from "@/types/portfolio";

export type { TransactionSortKey };
export type TransactionSort = Sort<TransactionSortKey>;

export interface TransactionFilters {
  search: string;
  side: TradeSide | "all";
  status: TransactionStatus | "all";
}

export const DEFAULT_FILTERS: TransactionFilters = { search: "", side: "all", status: "all" };
export const DEFAULT_SORT: TransactionSort = { key: "date", direction: "desc" };

export function nextTransactionSort(current: TransactionSort, key: TransactionSortKey): TransactionSort {
  if (current.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: key === "coin" ? "asc" : "desc" };
}
