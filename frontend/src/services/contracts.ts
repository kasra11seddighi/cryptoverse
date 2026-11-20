import type { TimeSeriesPoint } from "@/types/chart";
import type { Paginated } from "@/types/common";
import type {
  ChartInterval,
  Coin,
  CoinDetail,
  CoinListParams,
  CoinSearchResult,
  MarketOverview,
  PricePoint,
  TrendingCoin,
} from "@/types/market";
import type { CoinSort } from "@/types/market";
import type { PortfolioRange, PortfolioState, TradeOrder, TradeOutcome, TransactionQuery, TransactionsPage } from "@/types/portfolio";
import type { WatchlistState } from "@/types/watchlist";

/** The market data contract the UI depends on. It is served by the backend market API (see services/index.ts). */
export interface MarketService {
  getCoins(params?: CoinListParams): Promise<Paginated<Coin>>;
  /** `id` is a CoinGecko coin id such as "bitcoin". */
  getCoin(id: string): Promise<CoinDetail>;
  /** Coins in the requested order. Unknown ids are skipped. */
  getCoinsByIds(ids: readonly string[]): Promise<Coin[]>;
  getPriceHistory(id: string, interval: ChartInterval): Promise<PricePoint[]>;
  getMarketOverview(): Promise<MarketOverview>;
  getTrendingCoins(limit?: number): Promise<TrendingCoin[]>;
  searchCoins(query: string, limit?: number): Promise<CoinSearchResult[]>;
}

/** The simulated account, stored on the server. Orders are priced and validated there. */
export interface PortfolioService {
  getPortfolio(): Promise<PortfolioState>;
  trade(order: TradeOrder): Promise<TradeOutcome>;
  /** Deletes all transactions and restores the starting balance. */
  reset(): Promise<PortfolioState>;
  listTransactions(query: TransactionQuery): Promise<TransactionsPage>;
}

/** The followed coins and their sort order, stored on the server. Every call returns the updated watchlist. */
export interface WatchlistService {
  get(): Promise<WatchlistState>;
  add(coinId: string): Promise<WatchlistState>;
  remove(coinId: string): Promise<WatchlistState>;
  clear(): Promise<WatchlistState>;
  setSort(sort: CoinSort): Promise<WatchlistState>;
}

/**
 * Portfolio value over time. It is computed from the account snapshot passed in (loaded from the
 * server) and real historical prices from the market API.
 */
export interface PortfolioHistoryService {
  getPerformance(snapshot: PortfolioState, range: PortfolioRange): Promise<TimeSeriesPoint[]>;
}
