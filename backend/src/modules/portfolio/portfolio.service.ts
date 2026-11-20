// Implements the simulated account: reading it, trading, resetting and listing transactions.

import { AppError } from "../../shared/errors/AppError.js";
import { STARTING_BALANCE, planTrade, replayLedger } from "./portfolio.ledger.js";
import type { PortfolioRepository, StoredTransaction } from "./portfolio.repository.js";
import { SequenceConflictError } from "./portfolio.repository.js";
import type { QuoteProvider } from "./portfolio.quotes.js";
import type {
  PortfolioDto,
  TradeSide,
  TransactionDto,
  TransactionsPageDto,
  TransactionsQuery,
} from "./portfolio.types.js";

// Upper bound on stored transactions per user. The client values the account by replaying them,
// so the whole list is returned with the portfolio and must stay small.
export const MAX_TRANSACTIONS_PER_USER = 5_000;

// How many times a trade is retried when another request on the same account wins the race.
const MAX_ATTEMPTS = 3;

export interface TradeInput {
  coinId: string;
  side: TradeSide;
  quantity: number;
}

export interface TradeOutcome {
  portfolio: PortfolioDto;
  transaction: TransactionDto;
}

export function toTransactionDto(stored: StoredTransaction): TransactionDto {
  return {
    id: stored.id,
    coinId: stored.coinId,
    symbol: stored.symbol,
    name: stored.name,
    side: stored.side,
    quantity: stored.quantity,
    price: stored.price,
    total: stored.total,
    status: stored.status,
    createdAt: stored.createdAt.toISOString(),
    realizedPnl: stored.realizedPnl,
  };
}

// Builds the account snapshot from a starting balance and every stored transaction (oldest first).
function buildPortfolio(startingBalance: number, rows: readonly StoredTransaction[]): PortfolioDto {
  // Only completed transactions moved money, so only they are replayed.
  const completed = rows.filter((row) => row.status === "completed");
  const state = replayLedger(startingBalance, completed);

  return {
    startingBalance,
    cashBalance: state.cashBalance,
    holdings: state.holdings,
    transactions: [...completed].reverse().map(toTransactionDto),
  };
}

export class PortfolioService {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly quotes: QuoteProvider,
  ) {}

  async getPortfolio(userId: string): Promise<PortfolioDto> {
    const startingBalance = await this.repository.getOrCreateStartingBalance(userId, STARTING_BALANCE);
    return buildPortfolio(startingBalance, await this.repository.listAll(userId));
  }

  async trade(userId: string, input: TradeInput): Promise<TradeOutcome> {
    // The price is fetched once, before the account is read, so the slow call is not repeated on a retry.
    const quote = await this.quotes.getQuote(input.coinId);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const startingBalance = await this.repository.getOrCreateStartingBalance(userId, STARTING_BALANCE);
      const rows = await this.repository.listAll(userId);

      if (rows.length >= MAX_TRANSACTIONS_PER_USER) {
        throw new AppError(
          `The simulated account is limited to ${MAX_TRANSACTIONS_PER_USER} transactions. Reset the portfolio to continue.`,
          409,
        );
      }

      const state = replayLedger(
        startingBalance,
        rows.filter((row) => row.status === "completed"),
      );
      const order = { coinId: quote.coinId, symbol: quote.symbol, name: quote.name, side: input.side, quantity: input.quantity, price: quote.price };
      const plan = planTrade(state, order);
      if (!plan.ok) throw new AppError(plan.error, 422);

      const seq = (rows[rows.length - 1]?.seq ?? 0) + 1;
      try {
        const inserted = await this.repository.insert(userId, { ...order, seq, total: plan.total, realizedPnl: plan.realizedPnl });
        return {
          portfolio: buildPortfolio(startingBalance, [...rows, inserted]),
          transaction: toTransactionDto(inserted),
        };
      } catch (error) {
        // Someone else traded on this account between the read and the insert: read again and re-check the rules.
        if (error instanceof SequenceConflictError) continue;
        throw error;
      }
    }

    throw new AppError("Another trade was processed at the same time. Please try again.", 409);
  }

  async reset(userId: string): Promise<PortfolioDto> {
    await this.repository.reset(userId, STARTING_BALANCE);
    return buildPortfolio(STARTING_BALANCE, []);
  }

  async listTransactions(userId: string, query: TransactionsQuery): Promise<TransactionsPageDto> {
    const totals = await this.repository.totals(userId);
    let page = query.page;
    let result = await this.repository.query(userId, { ...query, page });

    // A page past the end (for example after a filter was applied) falls back to the last page.
    const totalPages = Math.max(1, Math.ceil(result.total / query.pageSize));
    if (page > totalPages) {
      page = totalPages;
      result = await this.repository.query(userId, { ...query, page });
    }

    return {
      items: result.items.map(toTransactionDto),
      total: result.total,
      page,
      pageSize: query.pageSize,
      totalPages,
      totals,
    };
  }
}
