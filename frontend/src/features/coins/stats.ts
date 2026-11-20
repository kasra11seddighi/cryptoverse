import type { Coin } from "@/types/market";

export interface CoinStats {
  /** 24h volume as a share of market cap, in percent, or null when either is unknown. */
  volumeToMarketCap: number | null;
  /** Circulating supply as a share of max supply, in percent, or null when uncapped or unknown. */
  circulatingPercent: number | null;
  /** Share of the global market capitalisation, in percent, or null when unknown. */
  marketShare: number | null;
}

/** Derived figures. Anything that cannot be computed from available data is null, never 0. */
export function computeCoinStats(coin: Coin, totalMarketCap: number | null): CoinStats {
  const { marketCap, volume24h, circulatingSupply, maxSupply } = coin;
  return {
    volumeToMarketCap: marketCap !== null && marketCap > 0 && volume24h !== null ? (volume24h / marketCap) * 100 : null,
    circulatingPercent:
      maxSupply !== null && maxSupply > 0 && circulatingSupply !== null ? (circulatingSupply / maxSupply) * 100 : null,
    marketShare: marketCap !== null && totalMarketCap !== null && totalMarketCap > 0 ? (marketCap / totalMarketCap) * 100 : null,
  };
}
