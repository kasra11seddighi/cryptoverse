import { ApiError, toApiError } from "@/lib/apiError";
import { useMarketStatusStore } from "@/stores/marketStatus.store";
import type { Paginated } from "@/types/common";
import type { ChartInterval, PricePoint } from "@/types/market";
import type { MarketService } from "../contracts";
import type { ChartDto, CoinDetailDto, CoinDto, EnvelopeDto, GlobalStatsDto, PageDto, SearchResultDto, TrendingCoinDto } from "./market.dto";
import { http } from "./http";
import { toCoin, toCoinDetail, toMarketOverview, toSearchResult, toTrendingCoin } from "./market.mapper";

/** Chart range -> `days` parameter of the backend chart endpoint. */
const DAYS: Record<ChartInterval, string> = {
  "24H": "1",
  "7D": "7",
  "30D": "30",
  "90D": "90",
  "1Y": "365",
  MAX: "max",
};

const MAX_IDS_PER_REQUEST = 100;

type Params = Record<string, string | number | undefined>;

function isEnvelope<T>(value: unknown): value is EnvelopeDto<T> {
  return typeof value === "object" && value !== null && "success" in value && "data" in value;
}

/** GET a market endpoint, unwrap the { success, data, meta } envelope and keep the feed-status indicator current. */
async function request<T>(path: string, params?: Params): Promise<T> {
  try {
    const response = await http.get<unknown>(`/market${path}`, { params });
    if (!isEnvelope<T>(response.data)) throw new ApiError("Unexpected response from the market service.");
    useMarketStatusStore.getState().reportSuccess(response.data.meta);
    return response.data.data;
  } catch (error) {
    useMarketStatusStore.getState().reportFailure();
    throw toApiError(error);
  }
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Market data from the CryptoVerse backend, which proxies CoinGecko. The browser never talks to CoinGecko's API. */
export const apiMarketService: MarketService = {
  async getCoins(params = {}) {
    const page = await request<PageDto<CoinDto>>("/coins", {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search === "" ? undefined : params.search,
      sortBy: params.sortBy,
      sortDirection: params.sortDirection,
    });
    const result: Paginated<ReturnType<typeof toCoin>> = { ...page, items: page.items.map(toCoin) };
    return result;
  },

  async getCoin(id) {
    return toCoinDetail(await request<CoinDetailDto>(`/coins/${encodeURIComponent(id)}`));
  },

  async getCoinsByIds(ids) {
    if (ids.length === 0) return [];
    const pages = await Promise.all(
      chunk(ids, MAX_IDS_PER_REQUEST).map((group) =>
        request<PageDto<CoinDto>>("/coins", { ids: group.join(",") }),
      ),
    );
    const byId = new Map(pages.flatMap((page) => page.items).map((dto) => [dto.id, toCoin(dto)] as const));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },

  async getPriceHistory(id, interval): Promise<PricePoint[]> {
    const chart = await request<ChartDto>(`/coins/${encodeURIComponent(id)}/chart`, { days: DAYS[interval] });
    return chart.prices.map((point) => ({ timestamp: point.timestamp, price: point.value }));
  },

  async getMarketOverview() {
    return toMarketOverview(await request<GlobalStatsDto>("/global"));
  },

  async getTrendingCoins(limit) {
    return (await request<TrendingCoinDto[]>("/trending", { limit })).map(toTrendingCoin);
  },

  async searchCoins(query, limit) {
    if (query.trim() === "") return [];
    return (await request<SearchResultDto[]>("/search", { query: query.trim(), limit })).map(toSearchResult);
  },
};
