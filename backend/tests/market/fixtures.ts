// Provides a fake CoinGecko provider and sample payloads shared by the market tests.

import { vi } from "vitest";

export const TEST_API_KEY = "CG-test-key-must-never-leak-123456";

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

/** One item of CoinGecko's `/coins/markets`. */
export function rawCoin(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    symbol: id.slice(0, 3),
    name: id.charAt(0).toUpperCase() + id.slice(1),
    image: `https://assets.example/${id}.png`,
    current_price: 100,
    market_cap: 1_000_000,
    market_cap_rank: 1,
    fully_diluted_valuation: 2_000_000,
    total_volume: 50_000,
    high_24h: 110,
    low_24h: 90,
    circulating_supply: 10_000,
    total_supply: 20_000,
    max_supply: null,
    ath: 200,
    ath_change_percentage: -50,
    atl: 1,
    atl_change_percentage: 9900,
    price_change_percentage_1h_in_currency: 0.1,
    price_change_percentage_24h_in_currency: 2.5,
    price_change_percentage_7d_in_currency: 5,
    price_change_percentage_30d_in_currency: 10,
    price_change_percentage_1y_in_currency: 50,
    ...overrides,
  };
}

export const RAW_UNIVERSE: Array<Record<string, unknown>> = [
  rawCoin("bitcoin", { symbol: "btc", current_price: 60_000, market_cap: 1_200_000_000, market_cap_rank: 1, total_volume: 30_000, price_change_percentage_24h_in_currency: 2 }),
  rawCoin("ethereum", { symbol: "eth", current_price: 3_000, market_cap: 360_000_000, market_cap_rank: 2, total_volume: 20_000, price_change_percentage_24h_in_currency: -1.5 }),
  rawCoin("solana", { symbol: "sol", current_price: 150, market_cap: 70_000_000, market_cap_rank: 5, total_volume: 5_000, price_change_percentage_24h_in_currency: 5 }),
  rawCoin("dogecoin", { symbol: "doge", current_price: 0.1, market_cap: 15_000_000, market_cap_rank: 8, total_volume: 900, price_change_percentage_24h_in_currency: 0 }),
];

export const RAW_GLOBAL = {
  data: {
    active_cryptocurrencies: 15_000,
    markets: 1_100,
    total_market_cap: { usd: 2_500_000_000_000 },
    total_volume: { usd: 90_000_000_000 },
    market_cap_percentage: { btc: 52.1, eth: 17.3 },
    market_cap_change_percentage_24h_usd: 1.2,
  },
};

export function rawDetail(id: string): Record<string, unknown> {
  return {
    id,
    symbol: id.slice(0, 3),
    name: id.charAt(0).toUpperCase() + id.slice(1),
    market_cap_rank: 1,
    categories: ["Smart Contract Platform", null, ""],
    description: { en: "A <b>great</b> coin &amp; network.<script>alert(1)</script>" },
    image: { large: `https://assets.example/${id}-large.png` },
    market_data: {
      current_price: { usd: 60_000 },
      market_cap: { usd: 1_200_000_000 },
      fully_diluted_valuation: { usd: 0 },
      total_volume: { usd: 30_000 },
      high_24h: { usd: 61_000 },
      low_24h: { usd: 59_000 },
      price_change_percentage_1h_in_currency: { usd: 0.2 },
      price_change_percentage_24h: 2,
      price_change_percentage_7d: 4,
      price_change_percentage_30d: 8,
      price_change_percentage_1y: 40,
      circulating_supply: 19_000_000,
      total_supply: 21_000_000,
      max_supply: 21_000_000,
      ath: { usd: 73_000 },
      ath_change_percentage: { usd: -17 },
      atl: { usd: 67 },
      atl_change_percentage: { usd: 89_000 },
    },
  };
}

export const RAW_CHART = {
  prices: [[3000, 3], [1000, 1], [2000, 2], ["bad", 9], [4000, null]],
  market_caps: [[1000, 10], [2000, 20]],
  total_volumes: [[1000, 5], [2000, 6]],
};

export const RAW_SEARCH = {
  coins: [
    { id: "bitcoin", name: "Bitcoin", symbol: "btc", market_cap_rank: 1, large: "https://assets.example/btc-l.png" },
    { id: "bitcoin-cash", name: "Bitcoin Cash", symbol: "bch", market_cap_rank: 30, thumb: "https://assets.example/bch-t.png" },
    { id: "", name: "Broken", symbol: "x" },
  ],
};

export const RAW_TRENDING = {
  coins: [
    { item: { id: "pepe", name: "Pepe", symbol: "pepe", market_cap_rank: 40, score: 0, large: "https://assets.example/pepe.png" } },
    { item: { id: "bonk", name: "Bonk", symbol: "bonk", market_cap_rank: null, score: 1, thumb: "https://assets.example/bonk.png" } },
    { item: null },
  ],
};

export interface ProviderCall {
  url: URL;
  headers: Headers;
}

export interface ProviderOptions {
  /** Return a Response to override the default behaviour for a request. */
  handler?: (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;
}

/** A fetch replacement that answers like CoinGecko and records every call. */
export function createProviderFetch(options: ProviderOptions = {}) {
  const calls: ProviderCall[] = [];

  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    calls.push({ url, headers: new Headers(init?.headers) });

    const custom = await options.handler?.(url, init);
    if (custom) return custom;

    const path = url.pathname.replace(/^\/api\/v3/, "");

    if (path === "/coins/markets") {
      const ids = url.searchParams.get("ids");
      const wanted = ids ? ids.split(",") : null;
      return jsonResponse(wanted ? RAW_UNIVERSE.filter((coin) => wanted.includes(String(coin.id))) : RAW_UNIVERSE);
    }
    if (path === "/global") return jsonResponse(RAW_GLOBAL);
    if (path === "/search/trending") return jsonResponse(RAW_TRENDING);
    if (path === "/search") return jsonResponse(RAW_SEARCH);
    if (path === "/simple/price") {
      const ids = (url.searchParams.get("ids") ?? "").split(",").filter((id) => id !== "unknown-coin");
      return jsonResponse(Object.fromEntries(ids.map((id) => [id, { usd: 1.5, usd_24h_change: -0.5 }])));
    }

    const chart = /^\/coins\/([^/]+)\/market_chart$/.exec(path);
    if (chart) return jsonResponse(RAW_CHART);

    const detail = /^\/coins\/([^/]+)$/.exec(path);
    if (detail?.[1]) return jsonResponse(rawDetail(decodeURIComponent(detail[1])));

    return jsonResponse({ error: "not found" }, { status: 404 });
  });

  return { fetch: fetchMock, calls };
}
