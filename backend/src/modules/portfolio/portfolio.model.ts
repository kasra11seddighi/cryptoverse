// Defines the simulated account document: one per user, created the first time it is needed.
import mongoose, { Schema } from "mongoose";

import type { Types } from "mongoose";

export interface IPortfolio {
  userId: Types.ObjectId;
  // Virtual cash the account started with. Current balances are derived from transactions, never stored.
  startingBalance: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const portfolioSchema = new Schema<IPortfolio>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    startingBalance: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Reuses the model when this module is loaded more than once (for example after a test resets the module registry).
export const Portfolio =
  mongoose.models.Portfolio || mongoose.model("Portfolio", portfolioSchema);

export default Portfolio;
