import type { Coin } from "@/types/market";
import type { PortfolioState, PortfolioSummary } from "@/types/portfolio";
import { assessPricing, usablePrice } from "./pricing";
import { createValuator } from "./valuation";

const DAY_MS = 86_400_000;

function percentOf(part: number, base: number): number {
  return base > 0 ? (part / base) * 100 : 0;
}

/**
 * Headline figures for the simulated account. `now` is passed in so the function stays pure.
 *
 * Missing prices are never guessed: if any holding has no usable live price, the totals that
 * depend on it (total value, profit/loss, 24h change) are null and `valuation` lists the symbols.
 * The 24h change compares today's value with the value one day ago at that day's prices, using
 * the account's holdings as they were then; it is null when a coin held then has no 24h figure.
 */
export function computePortfolioSummary(
  state: PortfolioState,
  coins: readonly Coin[],
  now: number,
): PortfolioSummary {
  const coinsById = new Map(coins.map((coin) => [coin.id, coin] as const));
  const valuation = assessPricing(state.holdings, coins);
  const valuator = createValuator(state);
  const startingCapital = valuator.startingCash;

  const base = {
    cashBalance: state.cashBalance,
    startingCapital,
    assetCount: state.holdings.length,
    valuation,
  };

  if (!valuation.complete) {
    return {
      ...base,
      totalValue: null,
      holdingsValue: null,
      profitLoss: null,
      profitLossPercent: null,
      change24h: null,
      change24hPercent: null,
    };
  }

  const holdingsValue = state.holdings.reduce(
    (sum, holding) => sum + holding.quantity * (usablePrice(coinsById.get(holding.coinId)?.price) ?? 0),
    0,
  );
  const totalValue = state.cashBalance + holdingsValue;
  const profitLoss = totalValue - startingCapital;

  // Price one day ago, derived from today's price and the provider's 24h change. If either is missing,
  // the 24h figure is not computable and is reported as null instead of assuming "no change".
  let dayAgoComplete = true;
  const priceDayAgo = (coinId: string): number => {
    const coin = coinsById.get(coinId);
    const price = usablePrice(coin?.price);
    const change = coin?.priceChange["24H"];
    if (price === null || typeof change !== "number" || !Number.isFinite(change) || change <= -100) {
      dayAgoComplete = false;
      return 0;
    }
    return price / (1 + change / 100);
  };
  const valueDayAgo = valuator.valueAt(now - DAY_MS, priceDayAgo);
  const change24h = dayAgoComplete ? totalValue - valueDayAgo : null;

  return {
    ...base,
    totalValue,
    holdingsValue,
    profitLoss,
    profitLossPercent: percentOf(profitLoss, startingCapital),
    change24h,
    change24hPercent: change24h === null ? null : percentOf(change24h, valueDayAgo),
  };
}
