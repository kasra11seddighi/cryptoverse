// Tests the trading flow end to end against an in-memory repository: pricing, rules, races and reset.

import { describe, expect, it } from "vitest";

import { AppError } from "../../src/shared/errors/AppError.js";
import { MAX_TRANSACTIONS_PER_USER, PortfolioService } from "../../src/modules/portfolio/portfolio.service.js";
import { STARTING_BALANCE } from "../../src/modules/portfolio/portfolio.ledger.js";
import { FakePortfolioRepository, fixedQuotes } from "./fakes.js";

const USER = "user-1";
const quotes = fixedQuotes({
  bitcoin: { symbol: "BTC", name: "Bitcoin", price: 50_000 },
  ethereum: { symbol: "ETH", name: "Ethereum", price: 2_500 },
});

function setup() {
  const repository = new FakePortfolioRepository();
  return { repository, service: new PortfolioService(repository, quotes) };
}

async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("expected the call to fail");
}

describe("PortfolioService.getPortfolio", () => {
  it("gives a new account the starting balance and nothing else", async () => {
    const { service } = setup();
    expect(await service.getPortfolio(USER)).toEqual({
      startingBalance: STARTING_BALANCE,
      cashBalance: STARTING_BALANCE,
      holdings: [],
      transactions: [],
    });
  });

  it("keeps accounts of different users apart", async () => {
    const { service } = setup();
    await service.trade("alice", { coinId: "bitcoin", side: "buy", quantity: 1 });
    expect((await service.getPortfolio("bob")).cashBalance).toBe(STARTING_BALANCE);
  });
});

describe("PortfolioService.trade", () => {
  it("executes a buy at the server price and returns the new account", async () => {
    const { service } = setup();
    const { portfolio, transaction } = await service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 0.5 });

    expect(transaction).toMatchObject({ coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", side: "buy", quantity: 0.5, price: 50_000, total: 25_000, status: "completed", realizedPnl: null });
    expect(portfolio.cashBalance).toBe(STARTING_BALANCE - 25_000);
    expect(portfolio.holdings).toEqual([{ coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", quantity: 0.5, averageBuyPrice: 50_000 }]);
    expect(portfolio.transactions.map((item) => item.id)).toEqual([transaction.id]);
  });

  it("records realised profit on a sell and lists the newest transaction first", async () => {
    const { service, repository } = setup();
    await service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 1 });

    const cheaper = new PortfolioService(repository, fixedQuotes({ bitcoin: { symbol: "BTC", name: "Bitcoin", price: 60_000 } }));
    const { portfolio, transaction } = await cheaper.trade(USER, { coinId: "bitcoin", side: "sell", quantity: 0.4 });

    expect(transaction.realizedPnl).toBeCloseTo(4_000, 6);
    expect(portfolio.holdings[0]?.quantity).toBeCloseTo(0.6, 10);
    expect(portfolio.cashBalance).toBeCloseTo(STARTING_BALANCE - 50_000 + 24_000, 6);
    expect(portfolio.transactions.map((item) => item.side)).toEqual(["sell", "buy"]);
  });

  it("rejects a buy the balance cannot cover with 422 and stores nothing", async () => {
    const { service, repository } = setup();
    const error = await failure(service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 3 }));
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe("Insufficient virtual balance for this order.");
    expect(repository.inserts).toBe(0);
  });

  it("rejects selling a coin that is not held", async () => {
    const { service } = setup();
    const error = await failure(service.trade(USER, { coinId: "ethereum", side: "sell", quantity: 1 }));
    expect(error.statusCode).toBe(422);
  });

  it("re-checks the rules when another trade wins the race, instead of overspending", async () => {
    const { service, repository } = setup();
    // The user can afford exactly one of these two 1.5 BTC buys (75,000 each out of 100,000).
    let raced = false;
    repository.beforeInsert = (userId) => {
      if (raced) return;
      raced = true;
      repository.seed(userId, { coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", side: "buy", quantity: 1.5, price: 50_000, total: 75_000, realizedPnl: null, seq: 1 });
    };

    const error = await failure(service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 1.5 }));
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe("Insufficient virtual balance for this order.");
    expect((await repository.listAll(USER)).length).toBe(1);
  });

  it("retries after a lost race and succeeds when the rules still hold", async () => {
    const { service, repository } = setup();
    let raced = false;
    repository.beforeInsert = (userId) => {
      if (raced) return;
      raced = true;
      repository.seed(userId, { coinId: "ethereum", symbol: "ETH", name: "Ethereum", side: "buy", quantity: 1, price: 2_500, total: 2_500, realizedPnl: null, seq: 1 });
    };

    const { transaction, portfolio } = await service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 1 });
    expect(transaction.coinId).toBe("bitcoin");
    expect(portfolio.transactions).toHaveLength(2);
    expect((await repository.listAll(USER)).map((row) => row.seq)).toEqual([1, 2]);
  });

  it("gives up with 409 when the account keeps changing", async () => {
    const { service, repository } = setup();
    let nextSeq = 1;
    repository.beforeInsert = (userId) => {
      repository.seed(userId, { coinId: "ethereum", symbol: "ETH", name: "Ethereum", side: "buy", quantity: 0.01, price: 2_500, total: 25, realizedPnl: null, seq: nextSeq });
      nextSeq += 1;
    };
    const error = await failure(service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 0.01 }));
    expect(error.statusCode).toBe(409);
  });

  it("refuses new trades once the transaction limit is reached", async () => {
    const { service, repository } = setup();
    for (let seq = 1; seq <= MAX_TRANSACTIONS_PER_USER; seq += 1) {
      repository.seed(USER, { coinId: "ethereum", symbol: "ETH", name: "Ethereum", side: "buy", quantity: 0.0001, price: 100, total: 0.01, realizedPnl: null, seq });
    }
    const error = await failure(service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 0.001 }));
    expect(error.statusCode).toBe(409);
  });

  it("passes quote failures through untouched", async () => {
    const repository = new FakePortfolioRepository();
    const service = new PortfolioService(repository, {
      async getQuote() {
        throw new AppError("A live price is unavailable right now. Please try again shortly.", 503);
      },
    });
    const error = await failure(service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 1 }));
    expect(error.statusCode).toBe(503);
    expect(repository.inserts).toBe(0);
  });
});

describe("PortfolioService.reset", () => {
  it("removes every transaction and restores the starting balance", async () => {
    const { service } = setup();
    await service.trade(USER, { coinId: "bitcoin", side: "buy", quantity: 1 });
    const portfolio = await service.reset(USER);
    expect(portfolio).toEqual({ startingBalance: STARTING_BALANCE, cashBalance: STARTING_BALANCE, holdings: [], transactions: [] });
    expect((await service.getPortfolio(USER)).transactions).toEqual([]);
  });

  it("does not touch another user's account", async () => {
    const { service } = setup();
    await service.trade("alice", { coinId: "bitcoin", side: "buy", quantity: 1 });
    await service.reset("bob");
    expect((await service.getPortfolio("alice")).transactions).toHaveLength(1);
  });
});
