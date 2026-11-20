// Tests that trades are priced from fresh market data only.

import { describe, expect, it } from "vitest";

import { AppError } from "../../src/shared/errors/AppError.js";
import { createMarketQuoteProvider } from "../../src/modules/portfolio/portfolio.quotes.js";
import type { CoinDto } from "../../src/modules/market/market.types.js";

function coin(overrides: Partial<CoinDto>): CoinDto {
  return {
    id: "bitcoin", symbol: "BTC", name: "Bitcoin", imageUrl: null, rank: 1, price: 50_000,
    marketCap: null, fullyDilutedValuation: null, volume24h: null, high24h: null, low24h: null,
    priceChange: { "1H": null, "24H": null, "7D": null, "30D": null, "1Y": null },
    circulatingSupply: null, totalSupply: null, maxSupply: null, ath: null, athChangePercent: null, atl: null, atlChangePercent: null,
    ...overrides,
  };
}

function market(items: CoinDto[], stale = false) {
  return {
    async getCoins() {
      return {
        data: { items, total: items.length, page: 1, pageSize: 1, totalPages: 1 },
        meta: { fetchedAt: "2026-11-17T10:00:00.000Z", stale },
      };
    },
  };
}

async function statusOf(promise: Promise<unknown>): Promise<number | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof AppError ? error.statusCode : -1;
  }
}

describe("createMarketQuoteProvider", () => {
  it("returns the live price with the coin's own symbol and name", async () => {
    const quote = await createMarketQuoteProvider(market([coin({})])).getQuote("bitcoin");
    expect(quote).toEqual({ coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 50_000 });
  });

  it("answers 404 for a coin the market does not know", async () => {
    expect(await statusOf(createMarketQuoteProvider(market([])).getQuote("nope"))).toBe(404);
  });

  it("refuses a stale price with 503", async () => {
    expect(await statusOf(createMarketQuoteProvider(market([coin({})], true)).getQuote("bitcoin"))).toBe(503);
  });

  it.each([0, -1, Number.NaN])("refuses the unusable price %s with 503", async (price) => {
    expect(await statusOf(createMarketQuoteProvider(market([coin({ price })])).getQuote("bitcoin"))).toBe(503);
  });
});
