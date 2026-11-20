// Tests that CoinGecko payloads are mapped safely: nulls instead of NaN/0, plain-text descriptions, downsampling.

import { describe, expect, it } from "vitest";

import { MarketError } from "../../src/modules/market/market.errors.js";
import {
  downsample,
  mapChart,
  mapCoinDetail,
  mapGlobal,
  mapMarketCoin,
  mapMarketCoins,
  mapSearchHits,
  mapSimplePrices,
  mapTrending,
  toPlainText,
} from "../../src/modules/market/market.mapper.js";
import { RAW_CHART, RAW_GLOBAL, RAW_SEARCH, RAW_TRENDING, rawCoin, rawDetail } from "./fixtures.js";

describe("mapMarketCoin", () => {
  it("maps a full coin and upper-cases the symbol", () => {
    const coin = mapMarketCoin(rawCoin("bitcoin", { symbol: "btc" }));
    expect(coin).toMatchObject({
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      price: 100,
      marketCap: 1_000_000,
      priceChange: { "1H": 0.1, "24H": 2.5, "7D": 5, "30D": 10, "1Y": 50 },
    });
  });

  it("returns null for entries without id, name or a numeric price", () => {
    expect(mapMarketCoin(null)).toBeNull();
    expect(mapMarketCoin("x")).toBeNull();
    expect(mapMarketCoin(rawCoin("a", { current_price: null }))).toBeNull();
    expect(mapMarketCoin(rawCoin("a", { current_price: "12" }))).toBeNull();
    expect(mapMarketCoin(rawCoin("a", { name: "" }))).toBeNull();
  });

  it("turns missing, non-numeric or zero market data into null (never 0 or NaN)", () => {
    const coin = mapMarketCoin(rawCoin("a", { market_cap: 0, fully_diluted_valuation: 0, total_volume: "n/a", ath: Number.NaN }));
    expect(coin?.marketCap).toBeNull();
    expect(coin?.fullyDilutedValuation).toBeNull();
    expect(coin?.volume24h).toBeNull();
    expect(coin?.ath).toBeNull();
  });

  it("falls back to the plain 24h percentage field", () => {
    const coin = mapMarketCoin(rawCoin("a", { price_change_percentage_24h_in_currency: undefined, price_change_percentage_24h: 9 }));
    expect(coin?.priceChange["24H"]).toBe(9);
  });

  it("skips unusable entries in a list and tolerates a non-array", () => {
    expect(mapMarketCoins([rawCoin("a"), { nope: true }, rawCoin("b")]).map((coin) => coin.id)).toEqual(["a", "b"]);
    expect(mapMarketCoins({})).toEqual([]);
  });
});

describe("toPlainText", () => {
  it("removes tags and decodes common entities", () => {
    expect(toPlainText("A <b>great</b>&nbsp;coin &amp; &quot;network&quot; &lt;3")).toBe('A great coin & "network" <3');
  });
});

describe("mapCoinDetail", () => {
  it("maps market data, strips HTML and drops blank categories", () => {
    const detail = mapCoinDetail(rawDetail("bitcoin"));
    expect(detail.price).toBe(60_000);
    expect(detail.description).not.toMatch(/<|>/);
    expect(detail.description).toContain("A great coin & network.");
    expect(detail.categories).toEqual(["Smart Contract Platform"]);
    expect(detail.fullyDilutedValuation).toBeNull();
    expect(detail.priceChange).toEqual({ "1H": 0.2, "24H": 2, "7D": 4, "30D": 8, "1Y": 40 });
    expect(detail.imageUrl).toBe("https://assets.example/bitcoin-large.png");
  });

  it("throws NOT_FOUND when the coin has no market data", () => {
    const broken = { ...rawDetail("x"), market_data: undefined };
    expect(() => mapCoinDetail(broken)).toThrow(MarketError);
    try {
      mapCoinDetail(broken);
    } catch (error) {
      expect((error as MarketError).statusCode).toBe(404);
      expect((error as MarketError).code).toBe("NOT_FOUND");
    }
    expect(() => mapCoinDetail(null)).toThrow(MarketError);
  });
});

describe("mapGlobal", () => {
  it("maps global statistics", () => {
    expect(mapGlobal(RAW_GLOBAL)).toEqual({
      totalMarketCap: 2_500_000_000_000,
      totalVolume24h: 90_000_000_000,
      btcDominance: 52.1,
      ethDominance: 17.3,
      marketCapChange24h: 1.2,
      activeCryptocurrencies: 15_000,
      markets: 1_100,
    });
  });

  it("throws UPSTREAM_ERROR on an unexpected payload", () => {
    expect(() => mapGlobal({})).toThrow(MarketError);
    expect(() => mapGlobal("html")).toThrow(MarketError);
  });
});

describe("charts", () => {
  it("sorts points by time and drops invalid pairs", () => {
    const chart = mapChart(RAW_CHART, "bitcoin", "7", "7", 500);
    expect(chart.prices).toEqual([
      { timestamp: 1000, value: 1 },
      { timestamp: 2000, value: 2 },
      { timestamp: 3000, value: 3 },
    ]);
    expect(chart.truncated).toBe(false);
  });

  it("flags a truncated range", () => {
    expect(mapChart(RAW_CHART, "bitcoin", "max", "365", 500)).toMatchObject({ days: "max", effectiveDays: "365", truncated: true });
  });

  it("rejects a non-object payload", () => {
    expect(() => mapChart([], "bitcoin", "7", "7", 500)).toThrow(MarketError);
  });

  it("downsamples while keeping the first and last point", () => {
    const points = Array.from({ length: 1000 }, (_, i) => ({ timestamp: i, value: i }));
    const sampled = downsample(points, 100);
    expect(sampled.length).toBeLessThanOrEqual(100);
    expect(sampled[0]).toEqual(points[0]);
    expect(sampled.at(-1)).toEqual(points[999]);
    expect(downsample(points.slice(0, 10), 100)).toHaveLength(10);
  });
});

describe("search, trending and simple prices", () => {
  it("maps search hits and skips incomplete ones", () => {
    const hits = mapSearchHits(RAW_SEARCH);
    expect(hits.map((hit) => hit.id)).toEqual(["bitcoin", "bitcoin-cash"]);
    expect(hits[0]).toMatchObject({ symbol: "BTC", imageUrl: "https://assets.example/btc-l.png" });
    expect(hits[1]?.imageUrl).toBe("https://assets.example/bch-t.png");
  });

  it("maps trending coins from coins[].item", () => {
    const trending = mapTrending(RAW_TRENDING);
    expect(trending.map((coin) => coin.id)).toEqual(["pepe", "bonk"]);
    expect(trending[1]?.rank).toBeNull();
  });

  it("maps simple prices and ignores malformed entries", () => {
    expect(mapSimplePrices({ bitcoin: { usd: 1, usd_24h_change: 2 }, junk: "x", partial: { usd: "?" } })).toEqual({
      bitcoin: { usd: 1, usd24hChange: 2 },
      partial: { usd: null, usd24hChange: null },
    });
    expect(mapSimplePrices(null)).toEqual({});
  });
});
