// Implements the watchlist: reading it, adding and removing coins, and remembering its sort order.

import { AppError } from "../../shared/errors/AppError.js";
import type { WatchlistRepository } from "./watchlist.repository.js";
import { MAX_WATCHLIST_COINS } from "./watchlist.types.js";
import type { WatchlistDto, WatchlistSort } from "./watchlist.types.js";

export class WatchlistService {
  constructor(private readonly repository: WatchlistRepository) {}

  getWatchlist(userId: string): Promise<WatchlistDto> {
    return this.repository.getOrCreate(userId);
  }

  async addCoin(userId: string, coinId: string): Promise<WatchlistDto> {
    const result = await this.repository.add(userId, coinId);
    if (!result) throw new AppError(`The watchlist is limited to ${MAX_WATCHLIST_COINS} coins.`, 409);
    return result;
  }

  removeCoin(userId: string, coinId: string): Promise<WatchlistDto> {
    return this.repository.remove(userId, coinId);
  }

  clear(userId: string): Promise<WatchlistDto> {
    return this.repository.clear(userId);
  }

  setSort(userId: string, sort: WatchlistSort): Promise<WatchlistDto> {
    return this.repository.setSort(userId, sort);
  }
}
