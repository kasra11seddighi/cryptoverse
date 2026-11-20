import { createValuator, trackedCoinIds } from "@/features/portfolio/valuation";
import type { TimeSeriesPoint } from "@/types/chart";
import type { ChartInterval, PricePoint } from "@/types/market";
import type { PortfolioRange } from "@/types/portfolio";
import type { MarketService, PortfolioHistoryService } from "../contracts";

/** Which historical price range each portfolio range is built from. "All" is capped by the provider's history. */
const RANGE_SOURCE: Record<PortfolioRange, ChartInterval> = {
  "24H": "24H",
  "7D": "7D",
  "1M": "30D",
  "3M": "90D",
  "1Y": "1Y",
  ALL: "MAX",
};

/** Price at or before `timestamp` (last known value); before the first point, the first point. */
export function priceAt(history: readonly PricePoint[], timestamp: number): number {
  const first = history[0];
  if (!first) return 0;
  let low = 0;
  let high = history.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((history[middle]?.timestamp ?? Infinity) <= timestamp) low = middle;
    else high = middle - 1;
  }
  return history[low]?.price ?? first.price;
}

/**
 * Portfolio value over time: the account's simulated transactions are replayed against real
 * historical prices from the market API. The simulated purchase prices in the ledger are untouched.
 * If a price history cannot be loaded the whole request fails; nothing is invented.
 */
export function createPortfolioHistoryService(market: MarketService): PortfolioHistoryService {
  return {
    async getPerformance(snapshot, range) {
      if (snapshot.transactions.length === 0 && snapshot.holdings.length === 0) return [];

      const interval = RANGE_SOURCE[range];
      const ids = trackedCoinIds(snapshot);
      const histories = new Map<string, PricePoint[]>();
      const loaded = await Promise.all(ids.map(async (id) => [id, await market.getPriceHistory(id, interval)] as const));
      loaded.forEach(([id, history]) => histories.set(id, history));

      // A coin with no price history would otherwise be valued at 0 and drag the chart down. Fail instead.
      const missing = loaded.filter(([, history]) => history.length === 0).map(([id]) => id);
      if (missing.length > 0) throw new Error(`Price history is unavailable for: ${missing.join(", ")}.`);

      // The densest history provides the time grid; every coin is valued on it.
      const grid = [...histories.values()].reduce<PricePoint[]>((best, history) => (history.length > best.length ? history : best), []);
      if (grid.length < 2) return [];

      const valuator = createValuator(snapshot);
      const firstTransaction = valuator.firstTransactionAt;
      const start =
        range === "ALL" && firstTransaction !== null
          ? Math.max(0, grid.findIndex((point) => point.timestamp >= firstTransaction))
          : 0;
      const points = grid.slice(start).length >= 2 ? grid.slice(start) : grid;

      return points.map(
        (point): TimeSeriesPoint => ({
          timestamp: point.timestamp,
          value: valuator.valueAt(point.timestamp, (coinId) => priceAt(histories.get(coinId) ?? [], point.timestamp)),
        }),
      );
    },
  };
}
