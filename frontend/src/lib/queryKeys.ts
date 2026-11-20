import type { ChartInterval, CoinListParams } from "@/types/market";
import type { PortfolioRange, TransactionQuery } from "@/types/portfolio";

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  portfolio: {
    /** The account snapshot from the server. */
    state: ["portfolio", "state"] as const,
    /** Values derived from the snapshot and live prices; invalidated together after every change. */
    derived: ["portfolio", "derived"] as const,
    summary: ["portfolio", "derived", "summary"] as const,
    details: ["portfolio", "derived", "details"] as const,
    performance: (range: PortfolioRange) => ["portfolio", "derived", "performance", range] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    list: (query: TransactionQuery) => ["transactions", "list", query] as const,
  },
  watchlist: ["watchlist"] as const,
  market: {
    all: ["market"] as const,
    coins: (params: CoinListParams) => ["market", "coins", params] as const,
    coin: (id: string) => ["market", "coin", id] as const,
    coinsByIds: (ids: readonly string[]) => ["market", "coins-by-ids", ids] as const,
    history: (id: string, interval: ChartInterval) =>
      ["market", "history", id, interval] as const,
    overview: ["market", "overview"] as const,
    trending: (limit: number) => ["market", "trending", limit] as const,
    search: (query: string) => ["market", "search", query] as const,
  },
} as const;
