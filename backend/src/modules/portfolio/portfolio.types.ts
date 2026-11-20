// Defines the data shapes shared by the portfolio, transactions and ledger code.

export type TradeSide = "buy" | "sell";
export type TransactionStatus = "completed" | "pending" | "failed";

// An open position in one coin. Prices are in USD.
export interface Holding {
  coinId: string;
  symbol: string;
  name: string;
  quantity: number;
  averageBuyPrice: number;
}

// The simulated account derived from its transactions.
export interface AccountState {
  cashBalance: number;
  holdings: Holding[];
}

// A trade the server has already priced. The price always comes from the market service, never from the client.
export interface PricedOrder {
  coinId: string;
  symbol: string;
  name: string;
  side: TradeSide;
  quantity: number;
  price: number;
}

// One stored transaction as the API returns it.
export interface TransactionDto {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  side: TradeSide;
  quantity: number;
  price: number;
  total: number;
  status: TransactionStatus;
  createdAt: string;
  realizedPnl: number | null;
}

// The whole account snapshot returned by GET /portfolio and after each trade or reset.
export interface PortfolioDto {
  startingBalance: number;
  cashBalance: number;
  holdings: Holding[];
  // Completed transactions, newest first. Needed by the client to value the account historically.
  transactions: TransactionDto[];
}

export const TRANSACTION_SORT_KEYS = ["date", "coin", "quantity", "price", "total"] as const;
export type TransactionSortKey = (typeof TRANSACTION_SORT_KEYS)[number];

export interface TransactionsQuery {
  page: number;
  pageSize: number;
  search: string;
  side: TradeSide | "all";
  status: TransactionStatus | "all";
  sortBy: TransactionSortKey;
  sortDirection: "asc" | "desc";
}

export interface TransactionTotals {
  completedCount: number;
  bought: number;
  sold: number;
  realizedPnl: number;
}

export interface TransactionsPageDto {
  items: TransactionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  // Totals over all completed transactions of the user, not only the filtered page.
  totals: TransactionTotals;
}
