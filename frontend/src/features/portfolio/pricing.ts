import type { Coin } from "@/types/market";
import type { Holding, PortfolioValuation } from "@/types/portfolio";

/** A live price is usable only when it is a finite number above zero. Anything else counts as unavailable. */
export function usablePrice(price: number | null | undefined): number | null {
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

/** Checks which holdings can be valued with a live price. Nothing is estimated here. */
export function assessPricing(holdings: readonly Holding[], coins: readonly Coin[]): PortfolioValuation {
  const coinsById = new Map(coins.map((coin) => [coin.id, coin] as const));
  const missingSymbols = holdings
    .filter((holding) => usablePrice(coinsById.get(holding.coinId)?.price) === null)
    .map((holding) => holding.symbol);
  return { complete: missingSymbols.length === 0, missingSymbols };
}
