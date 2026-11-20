// Tests the pure simulation rules: buying, selling, average price, realised profit and replaying history.

import { describe, expect, it } from "vitest";

import { STARTING_BALANCE, applyFill, planTrade, replayLedger } from "../../src/modules/portfolio/portfolio.ledger.js";
import type { LedgerFill } from "../../src/modules/portfolio/portfolio.ledger.js";
import type { AccountState, PricedOrder } from "../../src/modules/portfolio/portfolio.types.js";

const btc = { coinId: "bitcoin", symbol: "BTC", name: "Bitcoin" };

function order(overrides: Partial<PricedOrder>): PricedOrder {
  return { ...btc, side: "buy", quantity: 1, price: 100, ...overrides };
}

function fill(overrides: Partial<LedgerFill>): LedgerFill {
  const quantity = overrides.quantity ?? 1;
  const price = overrides.price ?? 100;
  return { ...btc, side: "buy", quantity, price, total: quantity * price, ...overrides };
}

describe("planTrade", () => {
  const empty: AccountState = { cashBalance: 1_000, holdings: [] };

  it("accepts a buy that the balance covers and reports no realised profit", () => {
    expect(planTrade(empty, order({ quantity: 2, price: 100 }))).toEqual({ ok: true, total: 200, realizedPnl: null });
  });

  it("rejects a buy larger than the balance", () => {
    const plan = planTrade(empty, order({ quantity: 11, price: 100 }));
    expect(plan).toEqual({ ok: false, error: "Insufficient virtual balance for this order." });
  });

  it("accepts a buy that spends the whole balance", () => {
    expect(planTrade(empty, order({ quantity: 10, price: 100 })).ok).toBe(true);
  });

  it("rejects a sell of a coin that is not held", () => {
    const plan = planTrade(empty, order({ side: "sell" }));
    expect(plan).toEqual({ ok: false, error: "You only hold 0 BTC." });
  });

  it("rejects a sell larger than the holding", () => {
    const state: AccountState = { cashBalance: 0, holdings: [{ ...btc, quantity: 1, averageBuyPrice: 100 }] };
    const plan = planTrade(state, order({ side: "sell", quantity: 1.5 }));
    expect(plan).toEqual({ ok: false, error: "You only hold 1 BTC." });
  });

  it("computes realised profit against the average buy price", () => {
    const state: AccountState = { cashBalance: 0, holdings: [{ ...btc, quantity: 2, averageBuyPrice: 100 }] };
    expect(planTrade(state, order({ side: "sell", quantity: 1, price: 150 }))).toEqual({ ok: true, total: 150, realizedPnl: 50 });
    expect(planTrade(state, order({ side: "sell", quantity: 1, price: 80 }))).toEqual({ ok: true, total: 80, realizedPnl: -20 });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects quantity %s", (quantity) => {
    expect(planTrade(empty, order({ quantity })).ok).toBe(false);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])("rejects price %s", (price) => {
    expect(planTrade(empty, order({ price })).ok).toBe(false);
  });

  it("rejects an order worth less than one cent", () => {
    expect(planTrade(empty, order({ quantity: 0.00001, price: 100 }))).toEqual({ ok: false, error: "The order value is too small." });
  });
});

describe("applyFill", () => {
  it("averages the buy price across several purchases", () => {
    let state: AccountState = { cashBalance: 10_000, holdings: [] };
    state = applyFill(state, fill({ quantity: 1, price: 100 }));
    state = applyFill(state, fill({ quantity: 3, price: 200 }));
    expect(state.holdings).toEqual([{ ...btc, quantity: 4, averageBuyPrice: 175 }]);
    expect(state.cashBalance).toBe(10_000 - 100 - 600);
  });

  it("keeps the average buy price when selling part of a holding", () => {
    const start: AccountState = { cashBalance: 0, holdings: [{ ...btc, quantity: 4, averageBuyPrice: 175 }] };
    const state = applyFill(start, fill({ side: "sell", quantity: 1, price: 300 }));
    expect(state.holdings).toEqual([{ ...btc, quantity: 3, averageBuyPrice: 175 }]);
    expect(state.cashBalance).toBe(300);
  });

  it("removes a holding that is sold completely", () => {
    const start: AccountState = { cashBalance: 0, holdings: [{ ...btc, quantity: 1, averageBuyPrice: 100 }] };
    expect(applyFill(start, fill({ side: "sell", quantity: 1, price: 100 })).holdings).toEqual([]);
  });

  it("leaves exactly zero cash after spending the whole balance", () => {
    const start: AccountState = { cashBalance: 0.3, holdings: [] };
    const state = applyFill(start, fill({ quantity: 0.1, price: 3 }));
    expect(state.cashBalance).toBe(0);
  });
});

describe("replayLedger", () => {
  it("returns the starting balance for an account without transactions", () => {
    expect(replayLedger(STARTING_BALANCE, [])).toEqual({ cashBalance: STARTING_BALANCE, holdings: [] });
  });

  it("rebuilds cash and holdings from a buy, a buy and a sell", () => {
    const state = replayLedger(1_000, [
      fill({ quantity: 2, price: 100 }),
      fill({ coinId: "ethereum", symbol: "ETH", name: "Ethereum", quantity: 1, price: 50 }),
      fill({ side: "sell", quantity: 1, price: 150 }),
    ]);
    expect(state.cashBalance).toBe(1_000 - 200 - 50 + 150);
    expect(state.holdings).toEqual([
      { ...btc, quantity: 1, averageBuyPrice: 100 },
      { coinId: "ethereum", symbol: "ETH", name: "Ethereum", quantity: 1, averageBuyPrice: 50 },
    ]);
  });

  it("gives the same result as applying each trade one by one", () => {
    const fills = [fill({ quantity: 1, price: 100 }), fill({ quantity: 2, price: 130 }), fill({ side: "sell", quantity: 2, price: 140 })];
    let state: AccountState = { cashBalance: 5_000, holdings: [] };
    for (const item of fills) state = applyFill(state, item);
    expect(replayLedger(5_000, fills)).toEqual(state);
  });
});
