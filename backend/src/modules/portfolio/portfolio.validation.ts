// Defines Zod validation schemas for portfolio and transaction requests.

import { z } from "zod";

import { MAX_QUANTITY_DECIMALS } from "./portfolio.ledger.js";
import { TRANSACTION_SORT_KEYS } from "./portfolio.types.js";

// CoinGecko ids are lowercase letters, digits, dots, underscores and hyphens.
export const COIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/;

export const coinIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(COIN_ID_PATTERN, "Coin id is not valid");

const MAX_QUANTITY = 1_000_000_000_000;

// True when the number has at most MAX_QUANTITY_DECIMALS decimal places (tolerating float noise).
function hasAllowedDecimals(value: number): boolean {
  const scaled = value * 10 ** MAX_QUANTITY_DECIMALS;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

// Validates a simulated order. A price is deliberately not accepted: the server prices every trade.
export const tradeSchema = z.object({
  coinId: coinIdSchema,
  side: z.enum(["buy", "sell"]),
  quantity: z
    .number({ error: "Quantity must be a number" })
    .positive("Quantity must be greater than zero")
    .max(MAX_QUANTITY, "Quantity is too large")
    .refine(hasAllowedDecimals, `Use at most ${MAX_QUANTITY_DECIMALS} decimal places`),
});

// Validates the query string of GET /transactions.
export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(64, "Search is too long").default(""),
  side: z.enum(["all", "buy", "sell"]).default("all"),
  status: z.enum(["all", "completed", "pending", "failed"]).default("all"),
  sortBy: z.enum(TRANSACTION_SORT_KEYS).default("date"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export type TradeBody = z.infer<typeof tradeSchema>;
