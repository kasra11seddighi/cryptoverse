// Pure simulation rules for the virtual account. No database, no HTTP, no clock.
// The account is never stored as a balance: it is always replayed from its completed transactions.

import type { AccountState, Holding, PricedOrder } from "./portfolio.types.js";

// Virtual cash every new simulated account starts with.
export const STARTING_BALANCE = 100_000;

// Smallest order the simulation accepts, in USD.
export const MIN_ORDER_VALUE_USD = 0.01;

// Quantities are limited to 8 decimal places, like most exchanges.
export const MAX_QUANTITY_DECIMALS = 8;

const EPSILON = 1e-10;
const CASH_EPSILON = 1e-9;

// A transaction as far as the ledger is concerned.
export interface LedgerFill {
  coinId: string;
  symbol: string;
  name: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
}

export type TradePlan =
  | { ok: true; total: number; realizedPnl: number | null }
  | { ok: false; error: string };

// Removes floating point dust so a fully spent balance is exactly zero.
function cleanCash(value: number): number {
  return Math.abs(value) < CASH_EPSILON ? 0 : value;
}

// Applies one fill without validating it. Used both for replaying history and for the next trade.
export function applyFill(state: AccountState, fill: LedgerFill): AccountState {
  const existing = state.holdings.find((holding) => holding.coinId === fill.coinId);

  if (fill.side === "buy") {
    const previousQuantity = existing?.quantity ?? 0;
    const previousCost = previousQuantity * (existing?.averageBuyPrice ?? 0);
    const nextQuantity = previousQuantity + fill.quantity;
    const next: Holding = {
      coinId: fill.coinId,
      symbol: fill.symbol,
      name: fill.name,
      quantity: nextQuantity,
      averageBuyPrice: (previousCost + fill.total) / nextQuantity,
    };

    return {
      cashBalance: cleanCash(state.cashBalance - fill.total),
      holdings: existing
        ? state.holdings.map((holding) => (holding.coinId === fill.coinId ? next : holding))
        : [...state.holdings, next],
    };
  }

  const remaining = (existing?.quantity ?? 0) - fill.quantity;
  return {
    cashBalance: cleanCash(state.cashBalance + fill.total),
    holdings:
      remaining <= EPSILON
        ? state.holdings.filter((holding) => holding.coinId !== fill.coinId)
        : state.holdings.map((holding) =>
            holding.coinId === fill.coinId ? { ...holding, quantity: remaining } : holding,
          ),
  };
}

// Rebuilds the account from the starting balance and its completed transactions in chronological order.
export function replayLedger(startingBalance: number, fills: Iterable<LedgerFill>): AccountState {
  let state: AccountState = { cashBalance: startingBalance, holdings: [] };
  for (const fill of fills) state = applyFill(state, fill);
  return state;
}

// Checks whether an order can be executed against the current account and works out its effect.
export function planTrade(state: AccountState, order: PricedOrder): TradePlan {
  const { coinId, symbol, side, quantity, price } = order;

  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "Enter a quantity greater than zero." };
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "The price for this asset is unavailable." };

  const total = quantity * price;
  if (total < MIN_ORDER_VALUE_USD) return { ok: false, error: "The order value is too small." };

  const existing = state.holdings.find((holding) => holding.coinId === coinId);

  if (side === "buy") {
    if (total > state.cashBalance + CASH_EPSILON) return { ok: false, error: "Insufficient virtual balance for this order." };
    return { ok: true, total, realizedPnl: null };
  }

  if (!existing || quantity > existing.quantity + EPSILON) {
    return { ok: false, error: `You only hold ${existing?.quantity ?? 0} ${symbol}.` };
  }
  return { ok: true, total, realizedPnl: (price - existing.averageBuyPrice) * quantity };
}
