// Defines the normalized data shapes returned by the market API.

/** Normalised shapes returned by /api/v1/market. Provider-specific fields never leave the backend. */

export const PRICE_CHANGE_PERIODS = ["1H", "24H", "7D", "30D", "1Y"] as const;
export type PriceChangePeriod = (typeof PRICE_CHANGE_PERIODS)[number];

export interface CoinDto {
  /** CoinGecko id. Stable identifier; symbols are not unique. */
  id: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  rank: number | null;
  /** All monetary values are in USD. null means "not available", never zero. */
  price: number;
  marketCap: number | null;
  fullyDilutedValuation: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  priceChange: Record<PriceChangePeriod, number | null>;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number | null;
  athChangePercent: number | null;
  atl: number | null;
  atlChangePercent: number | null;
}

export interface CoinDetailDto extends CoinDto {
  /** Plain text (HTML removed). */
  description: string | null;
  categories: string[];
}

export interface PageDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GlobalStatsDto {
  totalMarketCap: number | null;
  totalVolume24h: number | null;
  btcDominance: number | null;
  ethDominance: number | null;
  marketCapChange24h: number | null;
  activeCryptocurrencies: number | null;
  markets: number | null;
  /** Gainers and losers among the cached top coins, or null if that list is unavailable. */
  breadth: { gainers: number; losers: number; sampleSize: number } | null;
}

export interface ChartPointDto {
  timestamp: number;
  value: number;
}

export type ChartDays = "1" | "7" | "30" | "90" | "365" | "max";

export interface ChartDto {
  id: string;
  days: ChartDays;
  /** The range actually returned; differs from `days` when "max" had to fall back. */
  effectiveDays: ChartDays;
  truncated: boolean;
  prices: ChartPointDto[];
  marketCaps: ChartPointDto[];
  totalVolumes: ChartPointDto[];
}

export interface SearchResultDto {
  id: string;
  name: string;
  symbol: string;
  rank: number | null;
  imageUrl: string | null;
  /** Filled from the cached market list when the coin is in it, otherwise null. */
  price: number | null;
  change24h: number | null;
}

export interface TrendingCoinDto {
  id: string;
  name: string;
  symbol: string;
  rank: number | null;
  score: number | null;
  imageUrl: string | null;
}

export type SimplePricesDto = Record<string, { usd: number | null; usd24hChange: number | null }>;

export interface ResponseMeta {
  /** When the data was fetched from the provider (ISO 8601). */
  fetchedAt: string;
  /** True when the provider could not be reached and an older cached copy is being served. */
  stale: boolean;
}

export interface Served<T> {
  data: T;
  meta: ResponseMeta;
}

export type CoinSortKey = "rank" | "name" | "price" | "change24h" | "marketCap" | "volume24h" | "circulatingSupply";

export interface CoinsQuery {
  page: number;
  pageSize: number;
  search: string;
  sortBy: CoinSortKey;
  sortDirection: "asc" | "desc";
  /** When present, only these coin ids are returned (in this order) and paging is ignored. */
  ids: string[] | null;
}
