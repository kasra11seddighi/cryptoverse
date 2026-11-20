import { ApiError } from "@/lib/apiError";
import type { Holding, PortfolioState, TradeOutcome, Transaction, TransactionsPage, TransactionTotals } from "@/types/portfolio";
import { isRecord, readArray, readNumber, readString } from "./envelope";
import type { UnknownRecord } from "./envelope";

/** The only place that knows the shapes of /portfolio and /transactions. Anything unexpected becomes an ApiError. */

const WHAT = "portfolio";

function toRecord(value: unknown): UnknownRecord {
  if (!isRecord(value)) throw new ApiError(`Unexpected response from the ${WHAT} service.`);
  return value;
}

export function toTransaction(value: unknown): Transaction {
  const tx = toRecord(value);
  const side = readString(tx, "side", WHAT);
  const status = readString(tx, "status", WHAT);
  if (side !== "buy" && side !== "sell") throw new ApiError("The portfolio response has an unknown order side.");
  if (status !== "completed" && status !== "pending" && status !== "failed") {
    throw new ApiError("The portfolio response has an unknown transaction status.");
  }
  const pnl = tx.realizedPnl;
  return {
    id: readString(tx, "id", WHAT),
    coinId: readString(tx, "coinId", WHAT),
    symbol: readString(tx, "symbol", WHAT),
    name: readString(tx, "name", WHAT),
    side,
    quantity: readNumber(tx, "quantity", WHAT),
    price: readNumber(tx, "price", WHAT),
    total: readNumber(tx, "total", WHAT),
    status,
    createdAt: readString(tx, "createdAt", WHAT),
    realizedPnl: typeof pnl === "number" && Number.isFinite(pnl) ? pnl : null,
  };
}

function toHolding(value: unknown): Holding {
  const holding = toRecord(value);
  return {
    coinId: readString(holding, "coinId", WHAT),
    symbol: readString(holding, "symbol", WHAT),
    name: readString(holding, "name", WHAT),
    quantity: readNumber(holding, "quantity", WHAT),
    averageBuyPrice: readNumber(holding, "averageBuyPrice", WHAT),
  };
}

export function toPortfolioState(value: unknown): PortfolioState {
  const data = toRecord(value);
  return {
    cashBalance: readNumber(data, "cashBalance", WHAT),
    holdings: readArray(data, "holdings", WHAT).map(toHolding),
    transactions: readArray(data, "transactions", WHAT).map(toTransaction),
  };
}

export function toTradeOutcome(value: unknown): TradeOutcome {
  const data = toRecord(value);
  return { state: toPortfolioState(data.portfolio), transaction: toTransaction(data.transaction) };
}

function toTotals(value: unknown): TransactionTotals {
  const totals = toRecord(value);
  return {
    completedCount: readNumber(totals, "completedCount", WHAT),
    bought: readNumber(totals, "bought", WHAT),
    sold: readNumber(totals, "sold", WHAT),
    realizedPnl: readNumber(totals, "realizedPnl", WHAT),
  };
}

export function toTransactionsPage(value: unknown): TransactionsPage {
  const data = toRecord(value);
  return {
    items: readArray(data, "items", WHAT).map(toTransaction),
    total: readNumber(data, "total", WHAT),
    page: readNumber(data, "page", WHAT),
    pageSize: readNumber(data, "pageSize", WHAT),
    totalPages: readNumber(data, "totalPages", WHAT),
    totals: toTotals(data.totals),
  };
}
