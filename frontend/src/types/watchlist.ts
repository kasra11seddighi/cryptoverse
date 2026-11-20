import type { CoinSort } from "./market";

export interface WatchlistState {
  /** CoinGecko ids in the order they were added. */
  coinIds: string[];
  /** Sort order of the watchlist page, remembered between visits. */
  sort: CoinSort;
}
