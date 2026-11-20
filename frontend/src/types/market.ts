import type { SortDirection } from "./common";

/** Chart ranges. They map one-to-one to the ranges the backend market API supports. */
export const CHART_INTERVALS = ["24H", "7D", "30D", "90D", "1Y", "MAX"] as const;
export type ChartInterval = (typeof CHART_INTERVALS)[number];

/** Periods for which the market provider reports a percentage price change. */
export const PRICE_CHANGE_PERIODS = ["1H", "24H", "7D", "30D", "1Y"] as const;
export type PriceChangePeriod = (typeof PRICE_CHANGE_PERIODS)[number];

/**
 * A cryptocurrency from the market API. The id is the CoinGecko id (symbols are not unique).
 * Monetary values are USD. `null` means the provider has no value, which is not the same as zero.
 */
export interface Coin {
  id: string;
  rank: number | null;
  symbol: string;
  name: string;
  imageUrl: string | null;
  /** Decorative fallback colour derived from the id; used when no logo image is available. */
  color: string;
  price: number;
  priceChange: Record<PriceChangePeriod, number | null>;
  marketCap: number | null;
  fullyDilutedValue: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number | null;
  athChangePercent: number | null;
}

/** A coin with the extra fields only the details endpoint provides. */
export interface CoinDetail extends Coin {
  /** Plain text. */
  description: string | null;
  categories: string[];
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export type CoinSortKey =
  | "rank"
  | "name"
  | "price"
  | "change24h"
  | "marketCap"
  | "volume24h"
  | "circulatingSupply";

export interface CoinSort {
  key: CoinSortKey;
  direction: SortDirection;
}

export interface CoinListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: CoinSortKey;
  sortDirection?: SortDirection;
}

export interface MarketOverview {
  totalMarketCap: number | null;
  totalVolume24h: number | null;
  btcDominance: number | null;
  /** 24h change of the total market capitalisation, in percent. */
  marketCapChange24h: number | null;
  activeCryptocurrencies: number | null;
  /** Gainers and losers among the top coins, or null when unavailable. */
  breadth: { gainers: number; losers: number; sampleSize: number } | null;
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  rank: number | null;
  imageUrl: string | null;
  color: string;
  /** null when the coin is outside the cached top list. */
  price: number | null;
  change24h: number | null;
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  rank: number | null;
  score: number | null;
  imageUrl: string | null;
  color: string;
}
