// Defines the Transaction schema and MongoDB model for simulated trades.
import mongoose, { Schema } from "mongoose";

import type { Types } from "mongoose";

import type { TradeSide, TransactionStatus } from "./portfolio.types.js";

export interface ITransaction {
  userId: Types.ObjectId;
  // Per-user, strictly increasing number. Together with userId it is unique, which makes two
  // simultaneous trades on the same account impossible: the second insert is rejected.
  seq: number;
  coinId: string;
  symbol: string;
  name: string;
  side: TradeSide;
  quantity: number;
  price: number;
  total: number;
  status: TransactionStatus;
  realizedPnl: number | null;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seq: { type: Number, required: true, min: 1 },
    coinId: { type: String, required: true, trim: true, maxlength: 100 },
    symbol: { type: String, required: true, trim: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    side: { type: String, enum: ["buy", "sell"], required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["completed", "pending", "failed"],
      default: "completed",
    },
    realizedPnl: { type: Number, default: null },
  },
  {
    // Transactions are never edited, so only the creation time is kept.
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

// Guards against concurrent trades and serves the replay in chronological order.
transactionSchema.index({ userId: 1, seq: 1 }, { unique: true });

// Reuses the model when this module is loaded more than once (for example after a test resets the module registry).
export const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
export default Transaction;
