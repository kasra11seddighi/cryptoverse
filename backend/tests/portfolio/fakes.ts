// In-memory stand-ins for the repositories, so the services can be tested without a database.

import { SequenceConflictError } from "../../src/modules/portfolio/portfolio.repository.js";
import type { NewTransaction, PortfolioRepository, StoredTransaction } from "../../src/modules/portfolio/portfolio.repository.js";
import type { QuoteProvider } from "../../src/modules/portfolio/portfolio.quotes.js";
import type { TransactionsQuery, TransactionTotals } from "../../src/modules/portfolio/portfolio.types.js";

export class FakePortfolioRepository implements PortfolioRepository {
  accounts = new Map<string, number>();
  rows = new Map<string, StoredTransaction[]>();
  // Called right before an insert; tests use it to simulate another request winning the race.
  beforeInsert: ((userId: string) => void) | null = null;
  inserts = 0;

  async getOrCreateStartingBalance(userId: string, defaultBalance: number): Promise<number> {
    if (!this.accounts.has(userId)) this.accounts.set(userId, defaultBalance);
    return this.accounts.get(userId) ?? defaultBalance;
  }

  async listAll(userId: string): Promise<StoredTransaction[]> {
    return [...(this.rows.get(userId) ?? [])].sort((a, b) => a.seq - b.seq);
  }

  seed(userId: string, transaction: NewTransaction, createdAt = new Date("2026-01-01T00:00:00Z")): StoredTransaction {
    const stored: StoredTransaction = {
      id: `tx-${userId}-${transaction.seq}`,
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
      createdAt,
    };
    this.rows.set(userId, [...(this.rows.get(userId) ?? []), stored]);
    return stored;
  }

  async insert(userId: string, transaction: NewTransaction): Promise<StoredTransaction> {
    this.beforeInsert?.(userId);
    this.inserts += 1;
    if ((this.rows.get(userId) ?? []).some((row) => row.seq === transaction.seq)) throw new SequenceConflictError();
    return this.seed(userId, transaction, new Date("2026-06-01T00:00:00Z"));
  }

  async query(): Promise<{ items: StoredTransaction[]; total: number }> {
    throw new Error("not used in these tests");
  }

  async totals(): Promise<TransactionTotals> {
    throw new Error("not used in these tests");
  }

  async reset(userId: string, startingBalance: number): Promise<void> {
    this.rows.delete(userId);
    this.accounts.set(userId, startingBalance);
  }
}

export function fixedQuotes(prices: Record<string, { symbol: string; name: string; price: number }>): QuoteProvider {
  return {
    async getQuote(coinId) {
      const quote = prices[coinId];
      if (!quote) throw new Error(`no quote for ${coinId}`);
      return { coinId, ...quote };
    },
  };
}

export type { TransactionsQuery };
