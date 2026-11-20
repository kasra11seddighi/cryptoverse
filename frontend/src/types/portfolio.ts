import type { Paginated } from "./common";

export type TradeSide = "buy" | "sell";
export type TransactionStatus = "completed" | "pending" | "failed";

export interface Holding {
  coinId: string;
  symbol: string;
  name: string;
  quantity: number;
  /** Average purchase price in USD. */
  averageBuyPrice: number;
}

export interface Transaction {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  side: TradeSide;
  quantity: number;
  /** Execution price in USD. */
  price: number;
  /** quantity * price, in USD. */
  total: number;
  status: TransactionStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** Realised profit/loss for sells; null for buys. */
  realizedPnl: number | null;
}

export interface PortfolioState {
  cashBalance: number;
  holdings: Holding[];
  transactions: Transaction[];
}

/** A simulated order. The server prices it, so no price is sent. */
export interface TradeOrder {
  coinId: string;
  side: TradeSide;
  quantity: number;
}

export interface TradeOutcome {
  state: PortfolioState;
  transaction: Transaction;
}

export type TransactionSortKey = "date" | "coin" | "quantity" | "price" | "total";

export interface TransactionQuery {
  page: number;
  pageSize: number;
  search: string;
  side: TradeSide | "all";
  status: TransactionStatus | "all";
  sortBy: TransactionSortKey;
  sortDirection: "asc" | "desc";
}

/** Totals over all completed transactions of the account, not only the visible page. */
export interface TransactionTotals {
  completedCount: number;
  bought: number;
  sold: number;
  realizedPnl: number;
}

export interface TransactionsPage extends Paginated<Transaction> {
  totals: TransactionTotals;
}

export const PORTFOLIO_RANGES = ["24H", "7D", "1M", "3M", "1Y", "ALL"] as const;
export type PortfolioRange = (typeof PORTFOLIO_RANGES)[number];

/** Whether every holding could be valued with a usable live price. */
export interface PortfolioValuation {
  /** True only when every holding has a usable live price. */
  complete: boolean;
  /** Symbols of the holdings that have no usable live price. */
  missingSymbols: string[];
}

/**
 * Headline figures. A figure that cannot be computed honestly is `null` (shown as an em dash),
 * never zero and never an estimate built from the purchase price.
 */
export interface PortfolioSummary {
  /** Cash plus the current value of all holdings, in USD. Null while any holding has no live price. */
  totalValue: number | null;
  holdingsValue: number | null;
  cashBalance: number;
  /** Capital the simulated account started with (derived from its transactions). */
  startingCapital: number;
  /** totalValue - startingCapital: realised plus unrealised. */
  profitLoss: number | null;
  profitLossPercent: number | null;
  /** Null when the total is incomplete or a held coin has no 24h figure. */
  change24h: number | null;
  change24hPercent: number | null;
  assetCount: number;
  valuation: PortfolioValuation;
}

/** One open holding valued at the current market price. */
export interface PortfolioPosition {
  coinId: string;
  symbol: string;
  name: string;
  color: string;
  imageUrl: string | null;
  quantity: number;
  averageBuyPrice: number;
  /** False when no usable live price exists; price, value and profit/loss are then null. */
  priceAvailable: boolean;
  currentPrice: number | null;
  value: number | null;
  costBasis: number;
  /** Unrealised profit or loss: value - costBasis. Null without a live price. */
  pnl: number | null;
  pnlPercent: number | null;
  /** Share of the priced portfolio (cash included), 0 to 100. Null without a live price. */
  allocationPercent: number | null;
}

export interface AllocationSlice {
  id: string;
  label: string;
  color: string;
  value: number;
  percent: number;
}

export interface PnlBreakdownRow {
  coinId: string;
  symbol: string;
  name: string;
  color: string;
  imageUrl: string | null;
  held: boolean;
  /** False for an open holding without a live price; value, unrealised and total are then null. */
  priceAvailable: boolean;
  costBasis: number;
  value: number | null;
  unrealized: number | null;
  realized: number;
  total: number | null;
}

export interface PortfolioDetails {
  positions: PortfolioPosition[];
  allocation: AllocationSlice[];
  breakdown: PnlBreakdownRow[];
  valuation: PortfolioValuation;
}
