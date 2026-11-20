import type { Coin, CoinDetail, CoinSearchResult, MarketOverview, TrendingCoin } from "@/types/market";
import { colorFromId } from "@/utils/coins";
import type { CoinDetailDto, CoinDto, GlobalStatsDto, SearchResultDto, TrendingCoinDto } from "./market.dto";

/** The only place that knows the backend's market response shapes. UI code works with the types in types/market.ts. */

export function toCoin(dto: CoinDto): Coin {
  return {
    id: dto.id,
    rank: dto.rank,
    symbol: dto.symbol,
    name: dto.name,
    imageUrl: dto.imageUrl,
    color: colorFromId(dto.id),
    price: dto.price,
    priceChange: dto.priceChange,
    marketCap: dto.marketCap,
    fullyDilutedValue: dto.fullyDilutedValuation,
    volume24h: dto.volume24h,
    high24h: dto.high24h,
    low24h: dto.low24h,
    circulatingSupply: dto.circulatingSupply,
    totalSupply: dto.totalSupply,
    maxSupply: dto.maxSupply,
    ath: dto.ath,
    athChangePercent: dto.athChangePercent,
  };
}

export function toCoinDetail(dto: CoinDetailDto): CoinDetail {
  return { ...toCoin(dto), description: dto.description, categories: dto.categories };
}

export function toMarketOverview(dto: GlobalStatsDto): MarketOverview {
  return {
    totalMarketCap: dto.totalMarketCap,
    totalVolume24h: dto.totalVolume24h,
    btcDominance: dto.btcDominance,
    marketCapChange24h: dto.marketCapChange24h,
    activeCryptocurrencies: dto.activeCryptocurrencies,
    breadth: dto.breadth,
  };
}

export function toSearchResult(dto: SearchResultDto): CoinSearchResult {
  return { ...dto, color: colorFromId(dto.id) };
}

export function toTrendingCoin(dto: TrendingCoinDto): TrendingCoin {
  return { ...dto, color: colorFromId(dto.id) };
}
