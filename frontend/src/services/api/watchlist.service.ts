import { ApiError, toApiError } from "@/lib/apiError";
import type { CoinSortKey } from "@/types/market";
import type { WatchlistState } from "@/types/watchlist";
import type { WatchlistService } from "../contracts";
import { isRecord, readArray, unwrapData } from "./envelope";
import { http } from "./http";

const SORT_KEYS: readonly CoinSortKey[] = ["rank", "name", "price", "change24h", "marketCap", "volume24h", "circulatingSupply"];

function toWatchlist(value: unknown): WatchlistState {
  if (!isRecord(value) || !isRecord(value.sort)) throw new ApiError("Unexpected response from the watchlist service.");
  const { key, direction } = value.sort;
  if (!SORT_KEYS.includes(key as CoinSortKey) || (direction !== "asc" && direction !== "desc")) {
    throw new ApiError("The watchlist response has an unknown sort order.");
  }
  const coinIds = readArray(value, "coinIds", "watchlist").filter((id): id is string => typeof id === "string");
  return { coinIds, sort: { key: key as CoinSortKey, direction } };
}

async function call(run: () => Promise<{ data: unknown }>): Promise<WatchlistState> {
  try {
    return toWatchlist(unwrapData((await run()).data, "watchlist"));
  } catch (error) {
    throw toApiError(error);
  }
}

/** The watchlist lives on the server (MongoDB). Every request needs a signed-in user. */
export const apiWatchlistService: WatchlistService = {
  get: () => call(() => http.get<unknown>("/watchlist")),
  add: (coinId) => call(() => http.put<unknown>(`/watchlist/coins/${encodeURIComponent(coinId)}`)),
  remove: (coinId) => call(() => http.delete<unknown>(`/watchlist/coins/${encodeURIComponent(coinId)}`)),
  clear: () => call(() => http.delete<unknown>("/watchlist/coins")),
  setSort: (sort) => call(() => http.patch<unknown>("/watchlist/sort", sort)),
};
