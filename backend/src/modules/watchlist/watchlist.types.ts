// Defines the data shapes of the watchlist API.

export const WATCHLIST_SORT_KEYS = ["rank", "name", "price", "change24h", "marketCap", "volume24h", "circulatingSupply"] as const;
export type WatchlistSortKey = (typeof WATCHLIST_SORT_KEYS)[number];

export interface WatchlistSort {
  key: WatchlistSortKey;
  direction: "asc" | "desc";
}

export interface WatchlistDto {
  // CoinGecko ids in the order they were added.
  coinIds: string[];
  // Sort order of the watchlist page, remembered between visits.
  sort: WatchlistSort;
}

// What a new account's watchlist contains until the user changes it.
export const DEFAULT_WATCHLIST: WatchlistDto = {
  coinIds: ["bitcoin", "ethereum", "solana", "chainlink"],
  sort: { key: "rank", direction: "asc" },
};

// Upper bound on followed coins per user.
export const MAX_WATCHLIST_COINS = 100;
