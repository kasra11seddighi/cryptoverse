// Database access for the watchlist. The service only talks to this interface.

import { Types } from "mongoose";

import Watchlist from "./watchlist.model.js";
import type { IWatchlist } from "./watchlist.model.js";
import { DEFAULT_WATCHLIST, MAX_WATCHLIST_COINS } from "./watchlist.types.js";
import type { WatchlistDto, WatchlistSort } from "./watchlist.types.js";

export interface WatchlistRepository {
  // Returns the user's watchlist, creating it with the defaults the first time.
  getOrCreate(userId: string): Promise<WatchlistDto>;
  // Adds a coin (a no-op if present). Returns null when the list is full and the coin is new.
  add(userId: string, coinId: string): Promise<WatchlistDto | null>;
  remove(userId: string, coinId: string): Promise<WatchlistDto>;
  clear(userId: string): Promise<WatchlistDto>;
  setSort(userId: string, sort: WatchlistSort): Promise<WatchlistDto>;
}

type WatchlistRecord = Pick<IWatchlist, "coinIds" | "sort">;

function toDto(record: WatchlistRecord): WatchlistDto {
  return { coinIds: [...record.coinIds], sort: { key: record.sort.key, direction: record.sort.direction } };
}

export class MongoWatchlistRepository implements WatchlistRepository {
  async getOrCreate(userId: string): Promise<WatchlistDto> {
    // The upsert is atomic, so two first requests cannot create two watchlists.
    const record = await Watchlist.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $setOnInsert: { coinIds: DEFAULT_WATCHLIST.coinIds, sort: DEFAULT_WATCHLIST.sort } },
      { upsert: true, returnDocument: "after", lean: true },
    );
    if (!record) throw new Error("Watchlist could not be loaded");
    return toDto(record);
  }

  async add(userId: string, coinId: string): Promise<WatchlistDto | null> {
    await this.getOrCreate(userId);

    // Matches when the coin is already there (nothing changes) or when there is still room for one more.
    const record = await Watchlist.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        $or: [{ coinIds: coinId }, { [`coinIds.${MAX_WATCHLIST_COINS - 1}`]: { $exists: false } }],
      },
      { $addToSet: { coinIds: coinId } },
      { returnDocument: "after", lean: true },
    );
    return record ? toDto(record) : null;
  }

  async remove(userId: string, coinId: string): Promise<WatchlistDto> {
    await this.getOrCreate(userId);
    const record = await Watchlist.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $pull: { coinIds: coinId } },
      { returnDocument: "after", lean: true },
    );
    if (!record) throw new Error("Watchlist could not be loaded");
    return toDto(record);
  }

  async clear(userId: string): Promise<WatchlistDto> {
    await this.getOrCreate(userId);
    const record = await Watchlist.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { coinIds: [] } },
      { returnDocument: "after", lean: true },
    );
    if (!record) throw new Error("Watchlist could not be loaded");
    return toDto(record);
  }

  async setSort(userId: string, sort: WatchlistSort): Promise<WatchlistDto> {
    await this.getOrCreate(userId);
    const record = await Watchlist.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { sort: { key: sort.key, direction: sort.direction } } },
      { returnDocument: "after", lean: true },
    );
    if (!record) throw new Error("Watchlist could not be loaded");
    return toDto(record);
  }
}
