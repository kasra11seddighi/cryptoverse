/** Shapes returned by the backend market API (/api/v1/market). Kept in sync with the backend's market.types.ts. */

export interface MarketMetaDto {
  fetchedAt: string;
  stale: boolean;
}

export interface EnvelopeDto<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: MarketMetaDto;
}

export type PriceChangeDto = Record<"1H" | "24H" | "7D" | "30D" | "1Y", number | null>;

export interface CoinDto {
  id: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  rank: number | null;
  price: number;
  marketCap: number | null;
  fullyDilutedValuation: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  priceChange: PriceChangeDto;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number | null;
  athChangePercent: number | null;
}

export interface CoinDetailDto extends CoinDto {
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
  marketCapChange24h: number | null;
  activeCryptocurrencies: number | null;
  breadth: { gainers: number; losers: number; sampleSize: number } | null;
}

export interface ChartPointDto {
  timestamp: number;
  value: number;
}

export interface ChartDto {
  prices: ChartPointDto[];
}

export interface SearchResultDto {
  id: string;
  name: string;
  symbol: string;
  rank: number | null;
  imageUrl: string | null;
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
