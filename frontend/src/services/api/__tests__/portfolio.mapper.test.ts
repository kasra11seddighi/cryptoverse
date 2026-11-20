import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiError";
import { unwrapData } from "../envelope";
import { toPortfolioState, toTradeOutcome, toTransactionsPage } from "../portfolio.mapper";

const tx = {
  id: "t1", coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", side: "buy",
  quantity: 0.5, price: 50_000, total: 25_000, status: "completed",
  createdAt: "2026-11-17T10:00:00.000Z", realizedPnl: null,
};
const account = {
  startingBalance: 100_000,
  cashBalance: 75_000,
  holdings: [{ coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", quantity: 0.5, averageBuyPrice: 50_000 }],
  transactions: [tx],
};

describe("portfolio mapper", () => {
  it("maps the account snapshot", () => {
    expect(toPortfolioState(account)).toEqual({
      cashBalance: 75_000,
      holdings: account.holdings,
      transactions: [tx],
    });
  });

  it("keeps a numeric realised profit and turns anything else into null", () => {
    expect(toPortfolioState({ ...account, transactions: [{ ...tx, side: "sell", realizedPnl: -12.5 }] }).transactions[0]?.realizedPnl).toBe(-12.5);
    expect(toPortfolioState({ ...account, transactions: [{ ...tx, realizedPnl: "x" }] }).transactions[0]?.realizedPnl).toBeNull();
  });

  it("maps a trade result", () => {
    const outcome = toTradeOutcome({ portfolio: account, transaction: tx });
    expect(outcome.transaction.id).toBe("t1");
    expect(outcome.state.cashBalance).toBe(75_000);
  });

  it("maps a transactions page with its totals", () => {
    const page = toTransactionsPage({
      items: [tx], total: 1, page: 1, pageSize: 10, totalPages: 1,
      totals: { completedCount: 1, bought: 25_000, sold: 0, realizedPnl: 0 },
    });
    expect(page.items).toHaveLength(1);
    expect(page.totals.bought).toBe(25_000);
  });

  it.each([
    ["a missing cash balance", { ...account, cashBalance: undefined }],
    ["a text cash balance", { ...account, cashBalance: "75000" }],
    ["holdings that are not a list", { ...account, holdings: {} }],
    ["an unknown side", { ...account, transactions: [{ ...tx, side: "hold" }] }],
    ["an unknown status", { ...account, transactions: [{ ...tx, status: "lost" }] }],
    ["a non-finite quantity", { ...account, transactions: [{ ...tx, quantity: null }] }],
    ["a body that is not an object", "nope"],
  ])("throws an ApiError for %s", (_name, body) => {
    expect(() => toPortfolioState(body)).toThrow(ApiError);
  });
});

describe("unwrapData", () => {
  it("returns the data of a successful envelope", () => {
    expect(unwrapData({ success: true, message: "OK", data: { a: 1 } }, "x")).toEqual({ a: 1 });
  });

  it.each([null, "text", { data: {} }, { success: false, data: {} }, { success: true }])("rejects %j", (body) => {
    expect(() => unwrapData(body, "x")).toThrow(ApiError);
  });
});
