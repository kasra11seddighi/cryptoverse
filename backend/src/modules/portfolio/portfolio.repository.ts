// Database access for the simulated account. The service only talks to this interface,
// so the trading rules can be tested without a database.

import { Types } from "mongoose";
import type { QueryFilter } from "mongoose";

import Portfolio from "./portfolio.model.js";
import Transaction from "./transaction.model.js";
import type { ITransaction } from "./transaction.model.js";
import type {
  PricedOrder,
  TradeSide,
  TransactionStatus,
  TransactionsQuery,
  TransactionSortKey,
  TransactionTotals,
} from "./portfolio.types.js";

// A transaction as read from storage.
export interface StoredTransaction {
  id: string;
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

export interface NewTransaction extends PricedOrder {
  seq: number;
  total: number;
  realizedPnl: number | null;
}

// Thrown when another request already used this sequence number for the same user.
export class SequenceConflictError extends Error {
  constructor() {
    super("Transaction sequence number is already taken");
    this.name = "SequenceConflictError";
  }
}

export interface PortfolioRepository {
  // Returns the starting balance of the user's account, creating the account if it does not exist yet.
  getOrCreateStartingBalance(userId: string, defaultBalance: number): Promise<number>;
  // All transactions of the user, oldest first.
  listAll(userId: string): Promise<StoredTransaction[]>;
  insert(userId: string, transaction: NewTransaction): Promise<StoredTransaction>;
  query(userId: string, query: TransactionsQuery): Promise<{ items: StoredTransaction[]; total: number }>;
  totals(userId: string): Promise<TransactionTotals>;
  // Deletes every transaction of the user and sets the starting balance again.
  reset(userId: string, startingBalance: number): Promise<void>;
}

type TransactionRecord = ITransaction & { _id: Types.ObjectId };

function toStored(record: TransactionRecord): StoredTransaction {
  return {
    id: record._id.toString(),
    seq: record.seq,
    coinId: record.coinId,
    symbol: record.symbol,
    name: record.name,
    side: record.side,
    quantity: record.quantity,
    price: record.price,
    total: record.total,
    status: record.status,
    realizedPnl: record.realizedPnl ?? null,
    createdAt: record.createdAt,
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SORT_FIELDS: Record<TransactionSortKey, string> = {
  date: "seq",
  coin: "name",
  quantity: "quantity",
  price: "price",
  total: "total",
};

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

export class MongoPortfolioRepository implements PortfolioRepository {
  async getOrCreateStartingBalance(userId: string, defaultBalance: number): Promise<number> {
    // The upsert is atomic, so two first requests cannot create two accounts.
    const account = await Portfolio.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $setOnInsert: { startingBalance: defaultBalance } },
      { upsert: true, returnDocument: "after", lean: true },
    );
    return account?.startingBalance ?? defaultBalance;
  }

  async listAll(userId: string): Promise<StoredTransaction[]> {
    const records = await Transaction.find({ userId: new Types.ObjectId(userId) })
      .sort({ seq: 1 })
      .lean<TransactionRecord[]>();
    return records.map(toStored);
  }

  async insert(userId: string, transaction: NewTransaction): Promise<StoredTransaction> {
    try {
      const created = await Transaction.create({
        userId: new Types.ObjectId(userId),
        seq: transaction.seq,
        coinId: transaction.coinId,
        symbol: transaction.symbol,
        name: transaction.name,
        side: transaction.side,
        quantity: transaction.quantity,
        price: transaction.price,
        total: transaction.total,
        status: "completed",
        realizedPnl: transaction.realizedPnl,
      });
      return toStored(created.toObject() as TransactionRecord);
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new SequenceConflictError();
      throw error;
    }
  }

  async query(userId: string, query: TransactionsQuery): Promise<{ items: StoredTransaction[]; total: number }> {
    const filter: QueryFilter<ITransaction> = { userId: new Types.ObjectId(userId) };
    if (query.side !== "all") filter.side = query.side;
    if (query.status !== "all") filter.status = query.status;

    const search = query.search.trim();
    if (search !== "") {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { symbol: pattern }];
    }

    const direction = query.sortDirection === "asc" ? 1 : -1;
    const field = SORT_FIELDS[query.sortBy];
    // seq is the tie-breaker so paging stays stable when many rows share a value.
    const sort: Record<string, 1 | -1> = field === "seq" ? { seq: direction } : { [field]: direction, seq: -1 };

    const [records, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sort)
        .collation({ locale: "en", strength: 2 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<TransactionRecord[]>(),
      Transaction.countDocuments(filter),
    ]);
    return { items: records.map(toStored), total };
  }

  async totals(userId: string): Promise<TransactionTotals> {
    const groups = await Transaction.aggregate<{ _id: TradeSide; count: number; total: number; pnl: number }>([
      { $match: { userId: new Types.ObjectId(userId), status: "completed" } },
      {
        $group: {
          _id: "$side",
          count: { $sum: 1 },
          total: { $sum: "$total" },
          pnl: { $sum: { $ifNull: ["$realizedPnl", 0] } },
        },
      },
    ]);

    const buy = groups.find((group) => group._id === "buy");
    const sell = groups.find((group) => group._id === "sell");
    return {
      completedCount: (buy?.count ?? 0) + (sell?.count ?? 0),
      bought: buy?.total ?? 0,
      sold: sell?.total ?? 0,
      realizedPnl: sell?.pnl ?? 0,
    };
  }

  async reset(userId: string, startingBalance: number): Promise<void> {
    const id = new Types.ObjectId(userId);
    await Transaction.deleteMany({ userId: id });
    await Portfolio.updateOne({ userId: id }, { $set: { startingBalance } }, { upsert: true });
  }
}
