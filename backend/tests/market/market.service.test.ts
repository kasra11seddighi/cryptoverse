// Tests market business logic: list sorting/paging, id lookups, caching, stale fallback, and chart fallback.

import { describe, expect, it, vi } from "vitest";

import type { CoinGeckoClient } from "../../src/modules/market/coingecko.client.js";
import { MarketError } from "../../src/modules/market/market.errors.js";
import { CACHE_TTL_MS, MarketService, MAX_STALE_MS, sortCoinDtos } from "../../src/modules/market/market.service.js";
import type { CoinDto, CoinsQuery } from "../../src/modules/market/market.types.js";
import { mapMarketCoins } from "../../src/modules/market/market.mapper.js";
import { RAW_CHART, RAW_GLOBAL, RAW_SEARCH, RAW_TRENDING, RAW_UNIVERSE, rawCoin } from "./fixtures.js";

type GetMock = ReturnType<typeof vi.fn>;

function createHarness(getImpl?: (path: string, query: Record<string, unknown>) => unknown) {
  let clock = 1_000_000;
  const warn = vi.fn();
  const get: GetMock = vi.fn(async (path: string, query: Record<string, unknown> = {}) => {
    if (getImpl) return getImpl(path, query);
    if (path === "/coins/markets") {
      const ids = typeof query.ids === "string" ? query.ids.split(",") : null;
      return ids ? RAW_UNIVERSE.filter((coin) => ids.includes(String(coin.id))) : RAW_UNIVERSE;
    }
    if (path === "/global") return RAW_GLOBAL;
    if (path === "/search") return RAW_SEARCH;
    if (path === "/search/trending") return RAW_TRENDING;
    if (path.endsWith("/market_chart")) return RAW_CHART;
    throw new Error(`unexpected path ${path}`);
  });
  const service = new MarketService({ client: { get } as unknown as CoinGeckoClient, now: () => clock, logger: { warn } });
  return { service, get, warn, advance: (ms: number) => (clock += ms) };
}

const defaultQuery: CoinsQuery = { page: 1, pageSize: 20, search: "", sortBy: "rank", sortDirection: "asc", ids: null };

describe("sortCoinDtos", () => {
  const coins = mapMarketCoins([
    rawCoin("a", { market_cap: 10, market_cap_rank: 3 }),
    rawCoin("b", { market_cap: 0, market_cap_rank: null }),
    rawCoin("c", { market_cap: 30, market_cap_rank: 1 }),
  ]);

  it("always places missing values last, in both directions", () => {
    expect(sortCoinDtos(coins, "marketCap", "desc").map((coin: CoinDto) => coin.id)).toEqual(["c", "a", "b"]);
    expect(sortCoinDtos(coins, "marketCap", "asc").map((coin: CoinDto) => coin.id)).toEqual(["a", "c", "b"]);
    expect(sortCoinDtos(coins, "rank", "asc").map((coin: CoinDto) => coin.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate its input", () => {
    const before = coins.map((coin) => coin.id);
    sortCoinDtos(coins, "name", "desc");
    expect(coins.map((coin) => coin.id)).toEqual(before);
  });
});

describe("MarketService.getCoins", () => {
  it("returns a sorted, paged list and fetches the universe once per TTL", async () => {
    const { service, get, advance } = createHarness();

    const first = await service.getCoins({ ...defaultQuery, pageSize: 2, sortBy: "price", sortDirection: "desc" });
    expect(first.data.items.map((coin) => coin.id)).toEqual(["bitcoin", "ethereum"]);
    expect(first.data).toMatchObject({ total: 4, page: 1, pageSize: 2, totalPages: 2 });
    expect(first.meta.stale).toBe(false);

    const second = await service.getCoins({ ...defaultQuery, pageSize: 2, page: 2, sortBy: "price", sortDirection: "desc" });
    expect(second.data.items.map((coin) => coin.id)).toEqual(["solana", "dogecoin"]);
    expect(get).toHaveBeenCalledTimes(1);

    advance(CACHE_TTL_MS.list + 1);
    await service.getCoins(defaultQuery);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("sends the expected provider parameters", async () => {
    const { service, get } = createHarness();
    await service.getCoins(defaultQuery);
    expect(get).toHaveBeenCalledWith("/coins/markets", expect.objectContaining({ vs_currency: "usd", order: "market_cap_desc", per_page: 250, page: 1, sparkline: false }));
  });

  it("filters by name, symbol or id and clamps an out-of-range page", async () => {
    const { service } = createHarness();

    const bySymbol = await service.getCoins({ ...defaultQuery, search: "DOGE" });
    expect(bySymbol.data.items.map((coin) => coin.id)).toEqual(["dogecoin"]);

    const none = await service.getCoins({ ...defaultQuery, search: "zzz" });
    expect(none.data).toMatchObject({ items: [], total: 0, page: 1, totalPages: 1 });

    const clamped = await service.getCoins({ ...defaultQuery, pageSize: 3, page: 99 });
    expect(clamped.data.page).toBe(2);
    expect(clamped.data.items).toHaveLength(1);
  });

  it("returns exactly the requested ids in order, ignoring paging", async () => {
    const { service, get } = createHarness();
    const result = await service.getCoins({ ...defaultQuery, ids: ["solana", "bitcoin", "not-listed"] });
    expect(result.data.items.map((coin) => coin.id)).toEqual(["solana", "bitcoin"]);
    expect(result.data).toMatchObject({ total: 2, page: 1, totalPages: 1 });
    // One call for the universe, one extra call for the id outside it.
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenLastCalledWith("/coins/markets", expect.objectContaining({ ids: "not-listed", per_page: 1 }));
  });

  it("does not make an extra call when all ids are in the cached universe", async () => {
    const { service, get } = createHarness();
    await service.getCoins({ ...defaultQuery, ids: ["bitcoin", "ethereum"] });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("still resolves ids with a direct call when the universe is unavailable", async () => {
    const { service, warn } = createHarness((path, query) => {
      if (path === "/coins/markets" && query.ids === undefined) throw new MarketError("down", 502, "UPSTREAM_ERROR");
      return RAW_UNIVERSE.filter((coin) => String(query.ids).split(",").includes(String(coin.id)));
    });
    const result = await service.getCoins({ ...defaultQuery, ids: ["bitcoin"] });
    expect(result.data.items.map((coin) => coin.id)).toEqual(["bitcoin"]);
    expect(warn).toHaveBeenCalled();
  });

  it("serves a stale list when the provider fails after the TTL, then errors once it is too old", async () => {
    let failing = false;
    const { service, advance, warn } = createHarness((path) => {
      if (failing) throw new MarketError("limited", 429, "RATE_LIMITED", 30);
      if (path === "/coins/markets") return RAW_UNIVERSE;
      throw new Error("unexpected");
    });

    const fresh = await service.getCoins(defaultQuery);
    failing = true;
    advance(CACHE_TTL_MS.list + 1);

    const stale = await service.getCoins(defaultQuery);
    expect(stale.meta.stale).toBe(true);
    expect(stale.meta.fetchedAt).toBe(fresh.meta.fetchedAt);
    expect(stale.data.items).toHaveLength(4);
    expect(warn).toHaveBeenCalled();

    advance(MAX_STALE_MS + 1);
    await expect(service.getCoins(defaultQuery)).rejects.toMatchObject({ code: "RATE_LIMITED", retryAfterSeconds: 30 });
  });
});

describe("MarketService other endpoints", () => {
  it("returns coin detail through the cache", async () => {
    const { service, get } = createHarness((path) => {
      if (path === "/coins/bitcoin") {
        return {
          id: "bitcoin", symbol: "btc", name: "Bitcoin", market_cap_rank: 1, categories: [], description: { en: "" },
          market_data: { current_price: { usd: 5 } },
        };
      }
      throw new Error("unexpected");
    });
    const first = await service.getCoinDetail("bitcoin");
    await service.getCoinDetail("bitcoin");
    expect(first.data).toMatchObject({ id: "bitcoin", symbol: "BTC", price: 5, description: null });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("encodes the coin id in provider paths", async () => {
    const { service, get } = createHarness(() => ({}));
    await expect(service.getCoinDetail("a.b-c")).rejects.toBeInstanceOf(MarketError);
    expect(get).toHaveBeenCalledWith("/coins/a.b-c", expect.any(Object));
  });

  it("falls back to 365 days when the plan rejects the max chart range, and flags it", async () => {
    const { service, get } = createHarness((path, query) => {
      if (path.endsWith("/market_chart")) {
        if (query.days === "max") throw new MarketError("rejected", 502, "UPSTREAM_REJECTED");
        return RAW_CHART;
      }
      throw new Error("unexpected");
    });
    const chart = await service.getChart("bitcoin", "max");
    expect(chart.data).toMatchObject({ days: "max", effectiveDays: "365", truncated: true });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("does not fall back for other chart ranges or other errors", async () => {
    const { service } = createHarness(() => {
      throw new MarketError("rejected", 502, "UPSTREAM_REJECTED");
    });
    await expect(service.getChart("bitcoin", "90")).rejects.toMatchObject({ code: "UPSTREAM_REJECTED" });
  });

  it("adds breadth to global stats and still answers when the market list is unavailable", async () => {
    const ok = createHarness();
    const stats = await ok.service.getGlobal();
    expect(stats.data.breadth).toEqual({ gainers: 2, losers: 1, sampleSize: 4 });
    expect(stats.data.totalMarketCap).toBe(2_500_000_000_000);

    const degraded = createHarness((path) => {
      if (path === "/global") return RAW_GLOBAL;
      throw new MarketError("down", 502, "UPSTREAM_ERROR");
    });
    const withoutBreadth = await degraded.service.getGlobal();
    expect(withoutBreadth.data.breadth).toBeNull();
    expect(withoutBreadth.data.btcDominance).toBe(52.1);
  });

  it("enriches search hits with cached prices and respects the limit", async () => {
    const { service } = createHarness();
    const result = await service.search("bit", 1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: "bitcoin", price: 60_000, change24h: 2 });

    const all = await service.search("bit", 10);
    expect(all.data[1]).toMatchObject({ id: "bitcoin-cash", price: null, change24h: null });
  });

  it("returns search results without prices when the market list fails", async () => {
    const { service } = createHarness((path) => {
      if (path === "/search") return RAW_SEARCH;
      throw new MarketError("down", 502, "UPSTREAM_ERROR");
    });
    const result = await service.search("bit", 6);
    expect(result.data.map((hit) => hit.id)).toEqual(["bitcoin", "bitcoin-cash"]);
    expect(result.data.every((hit) => hit.price === null)).toBe(true);
  });

  it("limits trending results", async () => {
    const { service } = createHarness();
    expect((await service.getTrending(1)).data.map((coin) => coin.id)).toEqual(["pepe"]);
  });

  it("normalises the order of ids so equivalent price requests share one cache entry", async () => {
    const { service, get } = createHarness((path) => {
      if (path === "/simple/price") return { bitcoin: { usd: 1, usd_24h_change: 2 }, ethereum: { usd: 3, usd_24h_change: 4 } };
      throw new Error("unexpected");
    });
    await service.getPrices(["ethereum", "bitcoin"]);
    const second = await service.getPrices(["bitcoin", "ethereum"]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(second.data.bitcoin).toEqual({ usd: 1, usd24hChange: 2 });
    expect(get).toHaveBeenCalledWith("/simple/price", { ids: "bitcoin,ethereum", vs_currencies: "usd", include_24hr_change: true });
  });
});
