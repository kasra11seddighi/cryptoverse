// Implements market business logic: provider calls, caching, filtering, sorting, and paging.

import { CoinGeckoClient } from "./coingecko.client.js";
import { TtlCache } from "./market.cache.js";
import type { CacheResult } from "./market.cache.js";
import { getMarketConfig } from "./market.config.js";
import { MarketError } from "./market.errors.js";
import {
  mapChart,
  mapCoinDetail,
  mapGlobal,
  mapMarketCoins,
  mapSearchHits,
  mapSimplePrices,
  mapTrending,
} from "./market.mapper.js";
import type {
  ChartDays,
  ChartDto,
  CoinDetailDto,
  CoinDto,
  CoinsQuery,
  CoinSortKey,
  GlobalStatsDto,
  PageDto,
  SearchResultDto,
  Served,
  SimplePricesDto,
  TrendingCoinDto,
} from "./market.types.js";

/** How long each kind of data is served from memory before CoinGecko is asked again. */
export const CACHE_TTL_MS = {
  list: 60_000,
  global: 60_000,
  trending: 5 * 60_000,
  detail: 2 * 60_000,
  chart: 5 * 60_000,
  search: 30_000,
  prices: 30_000,
} as const;

/** When CoinGecko fails, a cached copy up to this old is served (marked stale) instead of an error. */
export const MAX_STALE_MS = 30 * 60_000;
const MAX_CHART_POINTS = 500;

const MARKET_PARAMS = {
  vs_currency: "usd",
  order: "market_cap_desc",
  sparkline: false,
  price_change_percentage: "1h,24h,7d,30d,1y",
} as const;

function toServed<T>(result: CacheResult<T>): Served<T> {
  return { data: result.value, meta: { fetchedAt: new Date(result.fetchedAt).toISOString(), stale: result.stale } };
}

function sortValue(coin: CoinDto, key: CoinSortKey): number | string | null {
  switch (key) {
    case "rank":
      return coin.rank;
    case "name":
      return coin.name.toLowerCase();
    case "price":
      return coin.price;
    case "change24h":
      return coin.priceChange["24H"];
    case "marketCap":
      return coin.marketCap;
    case "volume24h":
      return coin.volume24h;
    case "circulatingSupply":
      return coin.circulatingSupply;
  }
}

/** Sorts with missing values always last, whatever the direction. */
export function sortCoinDtos(coins: readonly CoinDto[], key: CoinSortKey, direction: "asc" | "desc"): CoinDto[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...coins].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return (left < right ? -1 : left > right ? 1 : 0) * sign;
  });
}

function matchesSearch(coin: CoinDto, search: string): boolean {
  const q = search.toLowerCase();
  return q === "" || coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q) || coin.id.includes(q);
}

export interface MarketServiceOptions {
  client?: CoinGeckoClient;
  now?: () => number;
  logger?: { warn(message: string): void };
}

/**
 * All market business logic: which CoinGecko call serves each request, caching, filtering,
 * sorting and paging. The cached "universe" (top coins by market cap, one provider call per
 * minute) answers every list, search enrichment and breadth request, which keeps credit use low.
 */
export class MarketService {
  private readonly client: CoinGeckoClient;
  private readonly logger: { warn(message: string): void };

  private readonly universeCache: TtlCache<CoinDto[]>;
  private readonly idsCache: TtlCache<CoinDto[]>;
  private readonly detailCache: TtlCache<CoinDetailDto>;
  private readonly chartCache: TtlCache<ChartDto>;
  private readonly globalCache: TtlCache<Omit<GlobalStatsDto, "breadth">>;
  private readonly searchCache: TtlCache<Array<Omit<SearchResultDto, "price" | "change24h">>>;
  private readonly trendingCache: TtlCache<TrendingCoinDto[]>;
  private readonly pricesCache: TtlCache<SimplePricesDto>;

  constructor(options: MarketServiceOptions = {}) {
    this.logger = options.logger ?? console;
    this.client = options.client ?? new CoinGeckoClient({ logger: this.logger, ...(options.now ? { now: options.now } : {}) });
    const cacheOptions = {
      ...(options.now ? { now: options.now } : {}),
      onStaleServed: (key: string, error: unknown) =>
        this.logger.warn(`[market] serving stale cache for "${key.split(":")[0] ?? key}" (${error instanceof MarketError ? error.code : "error"})`),
    };
    this.universeCache = new TtlCache(cacheOptions);
    this.idsCache = new TtlCache({ ...cacheOptions, maxEntries: 200 });
    this.detailCache = new TtlCache({ ...cacheOptions, maxEntries: 300 });
    this.chartCache = new TtlCache({ ...cacheOptions, maxEntries: 300 });
    this.globalCache = new TtlCache(cacheOptions);
    this.searchCache = new TtlCache({ ...cacheOptions, maxEntries: 200 });
    this.trendingCache = new TtlCache(cacheOptions);
    this.pricesCache = new TtlCache({ ...cacheOptions, maxEntries: 200 });
  }

  private loadUniverse(): Promise<CacheResult<CoinDto[]>> {
    return this.universeCache.getOrLoad("universe", CACHE_TTL_MS.list, MAX_STALE_MS, async () =>
      mapMarketCoins(
        await this.client.get("/coins/markets", { ...MARKET_PARAMS, per_page: getMarketConfig().listSize, page: 1 }),
      ),
    );
  }

  /** Paginated, searchable, sortable market list (or specific coins when `ids` is given). */
  async getCoins(query: CoinsQuery): Promise<Served<PageDto<CoinDto>>> {
    if (query.ids) return this.getCoinsByIds(query.ids);

    const universe = await this.loadUniverse();
    const sorted = sortCoinDtos(
      universe.value.filter((coin) => matchesSearch(coin, query.search)),
      query.sortBy,
      query.sortDirection,
    );

    const totalPages = Math.max(1, Math.ceil(sorted.length / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * query.pageSize;
    const served = toServed(universe);
    return {
      data: { items: sorted.slice(start, start + query.pageSize), total: sorted.length, page, pageSize: query.pageSize, totalPages },
      meta: served.meta,
    };
  }

  /** Specific coins in the requested order. Ids outside the cached top coins are looked up with one extra call. */
  private async getCoinsByIds(ids: readonly string[]): Promise<Served<PageDto<CoinDto>>> {
    let universe: CacheResult<CoinDto[]> | null = null;
    try {
      universe = await this.loadUniverse();
    } catch (error) {
      this.logger.warn(`[market] market list unavailable while resolving ids (${error instanceof MarketError ? error.code : "error"})`);
    }

    const byId = new Map<string, CoinDto>((universe?.value ?? []).map((coin) => [coin.id, coin] as const));
    const missing = ids.filter((id) => !byId.has(id));
    const results: Array<CacheResult<CoinDto[]>> = universe ? [universe] : [];

    if (missing.length > 0) {
      const key = `ids:${[...missing].sort().join(",")}`;
      const extra = await this.idsCache.getOrLoad(key, CACHE_TTL_MS.list, MAX_STALE_MS, async () =>
        mapMarketCoins(await this.client.get("/coins/markets", { ...MARKET_PARAMS, ids: missing.join(","), per_page: missing.length, page: 1 })),
      );
      extra.value.forEach((coin) => byId.set(coin.id, coin));
      results.push(extra);
    }

    const items = ids.flatMap((id) => byId.get(id) ?? []);
    const oldest = Math.min(...results.map((result) => result.fetchedAt));
    return {
      data: { items, total: items.length, page: 1, pageSize: Math.max(items.length, 1), totalPages: 1 },
      meta: { fetchedAt: new Date(oldest).toISOString(), stale: results.some((result) => result.stale) },
    };
  }

  async getCoinDetail(id: string): Promise<Served<CoinDetailDto>> {
    const result = await this.detailCache.getOrLoad(`detail:${id}`, CACHE_TTL_MS.detail, MAX_STALE_MS, async () =>
      mapCoinDetail(
        await this.client.get(`/coins/${encodeURIComponent(id)}`, {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
        }),
      ),
    );
    return toServed(result);
  }

  private async fetchChart(id: string, requested: ChartDays, effective: ChartDays): Promise<ChartDto> {
    const raw = await this.client.get(`/coins/${encodeURIComponent(id)}/market_chart`, { vs_currency: "usd", days: effective });
    return mapChart(raw, id, requested, effective, MAX_CHART_POINTS);
  }

  /**
   * Price, market cap and volume history. If the plan refuses the "max" range, one fallback request
   * for 365 days is made (and cached) and the result is flagged `truncated`.
   */
  async getChart(id: string, days: ChartDays): Promise<Served<ChartDto>> {
    const result = await this.chartCache.getOrLoad(`chart:${id}:${days}`, CACHE_TTL_MS.chart, MAX_STALE_MS, async () => {
      try {
        return await this.fetchChart(id, days, days);
      } catch (error) {
        if (days === "max" && error instanceof MarketError && error.code === "UPSTREAM_REJECTED") {
          return this.fetchChart(id, "max", "365");
        }
        throw error;
      }
    });
    return toServed(result);
  }

  async getGlobal(): Promise<Served<GlobalStatsDto>> {
    const stats = await this.globalCache.getOrLoad("global", CACHE_TTL_MS.global, MAX_STALE_MS, async () =>
      mapGlobal(await this.client.get("/global")),
    );

    let breadth: GlobalStatsDto["breadth"] = null;
    let stale = stats.stale;
    try {
      const universe = await this.loadUniverse();
      const gainers = universe.value.filter((coin) => (coin.priceChange["24H"] ?? 0) > 0).length;
      const losers = universe.value.filter((coin) => (coin.priceChange["24H"] ?? 0) < 0).length;
      breadth = { gainers, losers, sampleSize: universe.value.length };
      stale = stale || universe.stale;
    } catch {
      // Breadth is optional; global statistics are still returned without it.
    }

    const served = toServed(stats);
    return { data: { ...stats.value, breadth }, meta: { ...served.meta, stale } };
  }

  /** Coin search. Hits that are in the cached market list also carry price and 24h change. */
  async search(query: string, limit: number): Promise<Served<SearchResultDto[]>> {
    const hits = await this.searchCache.getOrLoad(`search:${query.toLowerCase()}`, CACHE_TTL_MS.search, MAX_STALE_MS, async () =>
      mapSearchHits(await this.client.get("/search", { query })),
    );

    let known = new Map<string, CoinDto>();
    try {
      known = new Map((await this.loadUniverse()).value.map((coin) => [coin.id, coin] as const));
    } catch {
      // Search still works without prices.
    }

    const items = hits.value.slice(0, limit).map((hit): SearchResultDto => {
      const coin = known.get(hit.id);
      return { ...hit, price: coin?.price ?? null, change24h: coin?.priceChange["24H"] ?? null };
    });
    return { data: items, meta: toServed(hits).meta };
  }

  async getTrending(limit: number): Promise<Served<TrendingCoinDto[]>> {
    const result = await this.trendingCache.getOrLoad("trending", CACHE_TTL_MS.trending, MAX_STALE_MS, async () =>
      mapTrending(await this.client.get("/search/trending")),
    );
    const served = toServed(result);
    return { data: served.data.slice(0, limit), meta: served.meta };
  }

  /** Lightweight price lookup (`/simple/price`) for a list of coin ids. */
  async getPrices(ids: readonly string[]): Promise<Served<SimplePricesDto>> {
    const sorted = [...ids].sort();
    const result = await this.pricesCache.getOrLoad(`prices:${sorted.join(",")}`, CACHE_TTL_MS.prices, MAX_STALE_MS, async () =>
      mapSimplePrices(
        await this.client.get("/simple/price", { ids: sorted.join(","), vs_currencies: "usd", include_24hr_change: true }),
      ),
    );
    return toServed(result);
  }
}
