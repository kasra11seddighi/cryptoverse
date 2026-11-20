import type { PortfolioState } from "@/types/portfolio";

const QUANTITY_EPSILON = 1e-10;

export interface PortfolioValuator {
  /** Cash the simulated account started with, reconstructed from its completed transactions. */
  startingCash: number;
  /** Time of the first completed transaction, or null for an untouched account. */
  firstTransactionAt: number | null;
  /** Total value (cash + holdings) at a moment in time, replaying transactions up to it. */
  valueAt: (timestamp: number, priceFor: (coinId: string) => number) => number;
}

/** Coins that ever appeared in the account; their prices are needed to value it historically. */
export function trackedCoinIds(state: PortfolioState): string[] {
  const ids = new Set(state.holdings.map((holding) => holding.coinId));
  for (const tx of state.transactions) {
    if (tx.status === "completed") ids.add(tx.coinId);
  }
  return [...ids].sort();
}

/** Pure valuation of the simulated account. No React, storage or network. */
export function createValuator(state: PortfolioState): PortfolioValuator {
  const events = state.transactions
    .filter((tx) => tx.status === "completed")
    .map((tx) => ({
      coinId: tx.coinId,
      time: Date.parse(tx.createdAt),
      side: tx.side,
      quantity: tx.quantity,
      total: tx.total,
    }));

  const startingCash = events.reduce(
    (cash, event) => cash + (event.side === "buy" ? event.total : -event.total),
    state.cashBalance,
  );
  const firstTransactionAt = events.length > 0 ? Math.min(...events.map((event) => event.time)) : null;

  function valueAt(timestamp: number, priceFor: (coinId: string) => number): number {
    let cash = startingCash;
    const quantities = new Map<string, number>();

    for (const event of events) {
      if (event.time > timestamp) continue;
      const sign = event.side === "buy" ? 1 : -1;
      cash -= sign * event.total;
      quantities.set(event.coinId, (quantities.get(event.coinId) ?? 0) + sign * event.quantity);
    }

    let value = cash;
    for (const [coinId, quantity] of quantities) {
      if (quantity > QUANTITY_EPSILON) value += quantity * priceFor(coinId);
    }
    return value;
  }

  return { startingCash, firstTransactionAt, valueAt };
}
