import { describe, expect, it } from "vitest";
import { computePortfolioSummary } from "../summary";
import { buildAllocation, computePortfolioDetails, computePositions } from "../positions";
import { buildValuationNotices } from "../valuationNotice";
import { rankPerformers } from "@/features/analytics/performers";
import type { Coin } from "@/types/market";
import type { PortfolioState } from "@/types/portfolio";

const NOW = Date.UTC(2026, 10, 17);
const DAY = 86_400_000;

function coin(id: string, price: number, change24h: number | null = 0): Coin {
  return {
    id,
    rank: 1,
    symbol: id.slice(0, 3).toUpperCase(),
    name: id,
    imageUrl: null,
    color: "#fff",
    price,
    priceChange: { "1H": null, "24H": change24h, "7D": null, "30D": null, "1Y": null },
    marketCap: null,
    fullyDilutedValue: null,
    volume24h: null,
    high24h: null,
    low24h: null,
    circulatingSupply: null,
    totalSupply: null,
    maxSupply: null,
    ath: null,
    athChangePercent: null,
  };
}

// 10,000 start: buy 1 BTC at 1,000 and 10 ETH at 100 => cash 8,000.
const state: PortfolioState = {
  cashBalance: 8_000,
  holdings: [
    { coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", quantity: 1, averageBuyPrice: 1_000 },
    { coinId: "ethereum", symbol: "ETH", name: "Ethereum", quantity: 10, averageBuyPrice: 100 },
  ],
  transactions: [
    { id: "1", coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", side: "buy", quantity: 1, price: 1_000, total: 1_000, status: "completed", createdAt: new Date(NOW - 10 * DAY).toISOString(), realizedPnl: null },
    { id: "2", coinId: "ethereum", symbol: "ETH", name: "Ethereum", side: "buy", quantity: 10, price: 100, total: 1_000, status: "completed", createdAt: new Date(NOW - 9 * DAY).toISOString(), realizedPnl: null },
  ],
};

describe("positions without a live price", () => {
  it("coin missing from the response: no value, no P/L, not valued at cost or zero", () => {
    const positions = computePositions(state, [coin("bitcoin", 2_000)]);
    const eth = positions.find((p) => p.coinId === "ethereum");
    expect(eth).toMatchObject({ priceAvailable: false, currentPrice: null, value: null, pnl: null, pnlPercent: null, allocationPercent: null });
    expect(positions.find((p) => p.coinId === "bitcoin")).toMatchObject({ priceAvailable: true, value: 2_000, pnl: 1_000 });
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])("unusable price %s counts as unavailable", (price) => {
    const [eth] = computePositions({ ...state, holdings: [state.holdings[1]!] }, [coin("ethereum", price)]);
    expect(eth?.pnl).toBeNull();
    expect(eth?.value).toBeNull();
  });

  it("unpriced positions sort last and are excluded from allocation", () => {
    const positions = computePositions(state, [coin("bitcoin", 2_000)]);
    expect(positions.map((p) => p.coinId)).toEqual(["bitcoin", "ethereum"]);
    const slices = buildAllocation(positions, state.cashBalance);
    expect(slices.map((s) => s.id).sort()).toEqual(["bitcoin", "cash"]);
  });

  it("unpriced positions are not ranked as performers", () => {
    const positions = computePositions(state, [coin("bitcoin", 2_000)]);
    const { best, worst } = rankPerformers(positions);
    expect([...best, ...worst].map((p) => p.coinId)).toEqual(["bitcoin"]);
  });

  it("breakdown row for an unpriced holding has null unrealised/total", () => {
    const details = computePortfolioDetails(state, [coin("bitcoin", 2_000)]);
    const eth = details.breakdown.find((r) => r.coinId === "ethereum");
    expect(eth).toMatchObject({ priceAvailable: false, value: null, unrealized: null, total: null });
    expect(details.valuation).toEqual({ complete: false, missingSymbols: ["ETH"] });
  });
});

describe("portfolio summary", () => {
  it("is complete and correct when every price is available", () => {
    const s = computePortfolioSummary(state, [coin("bitcoin", 2_000, 0), coin("ethereum", 150, 0)], NOW);
    expect(s.valuation.complete).toBe(true);
    expect(s.totalValue).toBe(8_000 + 2_000 + 1_500);
    expect(s.profitLoss).toBe(1_500);
    expect(s.change24h).toBe(0);
  });

  it("is incomplete (null totals) when one price is missing, never zero or cost-based", () => {
    const s = computePortfolioSummary(state, [coin("bitcoin", 2_000)], NOW);
    expect(s.valuation).toEqual({ complete: false, missingSymbols: ["ETH"] });
    expect(s.totalValue).toBeNull();
    expect(s.holdingsValue).toBeNull();
    expect(s.profitLoss).toBeNull();
    expect(s.profitLossPercent).toBeNull();
    expect(s.change24h).toBeNull();
    expect(s.cashBalance).toBe(8_000);
  });

  it("a null price is incomplete too", () => {
    const s = computePortfolioSummary(state, [coin("bitcoin", 2_000), coin("ethereum", Number.NaN)], NOW);
    expect(s.valuation.complete).toBe(false);
    expect(s.totalValue).toBeNull();
  });

  it("24h change is null, not 0, when a held coin has no 24h figure", () => {
    const s = computePortfolioSummary(state, [coin("bitcoin", 2_000, null), coin("ethereum", 150, 0)], NOW);
    expect(s.totalValue).toBe(11_500);
    expect(s.change24h).toBeNull();
    expect(s.change24hPercent).toBeNull();
  });

  it("an empty portfolio is complete", () => {
    const s = computePortfolioSummary({ cashBalance: 100, holdings: [], transactions: [] }, [], NOW);
    expect(s.valuation.complete).toBe(true);
    expect(s.totalValue).toBe(100);
  });
});

describe("stale data is distinguishable from fresh data", () => {
  const complete = { complete: true, missingSymbols: [] };
  it("fresh and complete: no notices", () => {
    expect(buildValuationNotices(complete, { status: "live", updatedAt: null })).toEqual([]);
    expect(buildValuationNotices(complete, { status: "unknown", updatedAt: null })).toEqual([]);
  });
  it("stale feed produces a stale notice", () => {
    const notices = buildValuationNotices(complete, { status: "stale", updatedAt: "2026-11-17T10:00:00.000Z" });
    expect(notices.map((n) => n.id)).toEqual(["stale"]);
  });
  it("failed feed produces its own notice", () => {
    expect(buildValuationNotices(complete, { status: "unavailable", updatedAt: null }).map((n) => n.id)).toEqual(["unavailable"]);
  });
  it("missing prices and stale data are reported together", () => {
    const notices = buildValuationNotices({ complete: false, missingSymbols: ["ETH"] }, { status: "stale", updatedAt: null });
    expect(notices.map((n) => n.id)).toEqual(["incomplete", "stale"]);
    expect(notices[0]?.message).toContain("ETH");
  });
});
