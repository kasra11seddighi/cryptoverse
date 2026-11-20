// Defines the Watchlist schema and MongoDB model: one document per user.
import mongoose, { Schema } from "mongoose";
import type { Model, Types } from "mongoose";

import { WATCHLIST_SORT_KEYS } from "./watchlist.types.js";
import type { WatchlistSort } from "./watchlist.types.js";

export interface IWatchlist {
  userId: Types.ObjectId;
  coinIds: string[];
  sort: WatchlistSort;
  createdAt?: Date;
  updatedAt?: Date;
}

const watchlistSchema = new Schema<IWatchlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    coinIds: {
      type: [String],
      default: [],
    },
    sort: {
      key: {
        type: String,
        enum: WATCHLIST_SORT_KEYS,
        required: true,
      },
      direction: {
        type: String,
        enum: ["asc", "desc"],
        required: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  },
);

// Reuse the existing model if it has already been registered.
const Watchlist =
  (mongoose.models["Watchlist"] as Model<IWatchlist> | undefined) ??
  mongoose.model<IWatchlist>("Watchlist", watchlistSchema);

export default Watchlist;
