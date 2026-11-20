// Integration tests against a real MongoDB. They run only when MONGODB_TEST_URI is set, for example:
//   MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test
// Each run uses its own throw-away database and drops it afterwards.

import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppError } from "../../src/shared/errors/AppError.js";
import { MongoPortfolioRepository } from "../../src/modules/portfolio/portfolio.repository.js";
import { PortfolioService } from "../../src/modules/portfolio/portfolio.service.js";
import { STARTING_BALANCE } from "../../src/modules/portfolio/portfolio.ledger.js";
import Transaction from "../../src/modules/portfolio/transaction.model.js";
import Portfolio from "../../src/modules/portfolio/portfolio.model.js";
import type { TransactionsQuery } from "../../src/modules/portfolio/portfolio.types.js";
import { MongoWatchlistRepository } from "../../src/modules/watchlist/watchlist.repository.js";
import { WatchlistService } from "../../src/modules/watchlist/watchlist.service.js";
import Watchlist from "../../src/modules/watchlist/watchlist.model.js";
import { MAX_WATCHLIST_COINS } from "../../src/modules/watchlist/watchlist.types.js";
import { fixedQuotes } from "./fakes.js";

const uri = process.env.MONGODB_TEST_URI;
const newUser = (): string => new Types.ObjectId().toString();

const quotes = fixedQuotes({
  bitcoin: { symbol: "BTC", name: "Bitcoin", price: 10_000 },
  ethereum: { symbol: "ETH", name: "Ethereum", price: 2_000 },
  solana: { symbol: "SOL", name: "Solana", price: 100 },
});

const defaults: TransactionsQuery = { page: 1, pageSize: 10, search: "", side: "all", status: "all", sortBy: "date", sortDirection: "desc" };

describe.skipIf(!uri)("portfolio and watchlist on a real MongoDB", () => {
  const dbName = `cryptoverse_test_${Date.now()}`;
  const service = new PortfolioService(new MongoPortfolioRepository(), quotes);
  const watchlist = new WatchlistService(new MongoWatchlistRepository());

  beforeAll(async () => {
    await mongoose.connect(uri as string, { dbName });
    await Promise.all([Transaction.init(), Portfolio.init(), Watchlist.init()]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe("trading", () => {
    it("creates the account once and persists trades across service instances", async () => {
      const user = newUser();
      expect((await service.getPortfolio(user)).cashBalance).toBe(STARTING_BALANCE);
      await service.trade(user, { coinId: "bitcoin", side: "buy", quantity: 2 });

      const fresh = new PortfolioService(new MongoPortfolioRepository(), quotes);
      const portfolio = await fresh.getPortfolio(user);
      expect(portfolio.cashBalance).toBe(STARTING_BALANCE - 20_000);
      expect(portfolio.holdings).toEqual([{ coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", quantity: 2, averageBuyPrice: 10_000 }]);
      expect(await Portfolio.countDocuments({ userId: new Types.ObjectId(user) })).toBe(1);
    });

    it("keeps one account when the first requests arrive together", async () => {
      const user = newUser();
      await Promise.all(Array.from({ length: 8 }, () => service.getPortfolio(user)));
      expect(await Portfolio.countDocuments({ userId: new Types.ObjectId(user) })).toBe(1);
    });

    it("never overspends when many buys arrive at the same time", async () => {
      const user = newUser();
      // Each buy costs 40,000 of the 100,000 balance: at most two can ever succeed.
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () => service.trade(user, { coinId: "bitcoin", side: "buy", quantity: 4 })),
      );

      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failures = results.flatMap((result) => (result.status === "rejected" ? [result.reason as unknown] : []));
      expect(succeeded).toBeGreaterThanOrEqual(1);
      expect(succeeded).toBeLessThanOrEqual(2);
      for (const reason of failures) {
        expect(reason).toBeInstanceOf(AppError);
        expect([409, 422]).toContain((reason as AppError).statusCode);
      }

      const portfolio = await service.getPortfolio(user);
      expect(portfolio.transactions).toHaveLength(succeeded);
      expect(portfolio.cashBalance).toBe(STARTING_BALANCE - 40_000 * succeeded);
      expect(portfolio.cashBalance).toBeGreaterThanOrEqual(0);

      const seqs = (await Transaction.find({ userId: new Types.ObjectId(user) }).sort({ seq: 1 }).lean()).map((row) => row.seq);
      expect(seqs).toEqual(Array.from({ length: succeeded }, (_, index) => index + 1));
    });

    it("rejects a duplicate sequence number at the database level", async () => {
      const user = newUser();
      const userId = new Types.ObjectId(user);
      const row = { userId, seq: 1, coinId: "bitcoin", symbol: "BTC", name: "Bitcoin", side: "buy", quantity: 1, price: 1, total: 1, status: "completed", realizedPnl: null };
      await Transaction.create(row);
      await expect(Transaction.create(row)).rejects.toMatchObject({ code: 11000 });
    });

    it("sells at a profit, records realised P/L and removes a closed position", async () => {
      const user = newUser();
      await service.trade(user, { coinId: "ethereum", side: "buy", quantity: 5 });
      const sold = new PortfolioService(new MongoPortfolioRepository(), fixedQuotes({ ethereum: { symbol: "ETH", name: "Ethereum", price: 3_000 } }));
      const { transaction, portfolio } = await sold.trade(user, { coinId: "ethereum", side: "sell", quantity: 5 });

      expect(transaction.realizedPnl).toBe(5_000);
      expect(portfolio.holdings).toEqual([]);
      expect(portfolio.cashBalance).toBe(STARTING_BALANCE + 5_000);
    });

    it("reset deletes the user's data and leaves other users alone", async () => {
      const mine = newUser();
      const other = newUser();
      await service.trade(mine, { coinId: "bitcoin", side: "buy", quantity: 1 });
      await service.trade(other, { coinId: "bitcoin", side: "buy", quantity: 1 });

      const portfolio = await service.reset(mine);
      expect(portfolio.transactions).toEqual([]);
      expect(await Transaction.countDocuments({ userId: new Types.ObjectId(mine) })).toBe(0);
      expect((await service.getPortfolio(mine)).cashBalance).toBe(STARTING_BALANCE);
      expect(await Transaction.countDocuments({ userId: new Types.ObjectId(other) })).toBe(1);
    });
  });

  describe("listing transactions", () => {
    const user = newUser();

    beforeAll(async () => {
      // Oldest to newest: BTC buy 1, ETH buy 10, SOL buy 100, BTC sell 0.5, ETH sell 4.
      await service.trade(user, { coinId: "bitcoin", side: "buy", quantity: 1 });
      await service.trade(user, { coinId: "ethereum", side: "buy", quantity: 10 });
      await service.trade(user, { coinId: "solana", side: "buy", quantity: 100 });
      await service.trade(user, { coinId: "bitcoin", side: "sell", quantity: 0.5 });
      await service.trade(user, { coinId: "ethereum", side: "sell", quantity: 4 });
    });

    const coins = async (patch: Partial<TransactionsQuery>) => (await service.listTransactions(user, { ...defaults, ...patch })).items.map((item) => `${item.side}:${item.symbol}`);

    it("lists newest first by default", async () => {
      expect(await coins({})).toEqual(["sell:ETH", "sell:BTC", "buy:SOL", "buy:ETH", "buy:BTC"]);
    });

    it("sorts by date ascending", async () => {
      expect(await coins({ sortDirection: "asc" })).toEqual(["buy:BTC", "buy:ETH", "buy:SOL", "sell:BTC", "sell:ETH"]);
    });

    it("sorts by coin name regardless of case", async () => {
      expect((await coins({ sortBy: "coin", sortDirection: "asc" })).map((item) => item.split(":")[1])).toEqual(["BTC", "BTC", "ETH", "ETH", "SOL"]);
    });

    it.each([
      ["total", [20_000, 20_000, 10_000, 5_000, 10_000]],
      ["quantity", [100, 10, 4, 1, 0.5]],
      ["price", [10_000, 10_000, 2_000, 2_000, 100]],
    ] as const)("sorts by %s descending", async (sortBy) => {
      const items = (await service.listTransactions(user, { ...defaults, sortBy, sortDirection: "desc" })).items;
      const values = items.map((item) => item[sortBy]);
      expect(values).toEqual([...values].sort((a, b) => b - a));
    });

    it("filters by side and status", async () => {
      expect(await coins({ side: "sell" })).toEqual(["sell:ETH", "sell:BTC"]);
      expect(await coins({ status: "failed" })).toEqual([]);
    });

    it("searches name or symbol, ignoring case and treating the text literally", async () => {
      expect(await coins({ search: "ETHER" })).toEqual(["sell:ETH", "buy:ETH"]);
      expect(await coins({ search: "sol" })).toEqual(["buy:SOL"]);
      expect(await coins({ search: ".*" })).toEqual([]);
    });

    it("pages the results and reports totals over the whole account", async () => {
      const first = await service.listTransactions(user, { ...defaults, pageSize: 2 });
      expect(first).toMatchObject({ total: 5, page: 1, pageSize: 2, totalPages: 3 });
      expect(first.items).toHaveLength(2);

      const last = await service.listTransactions(user, { ...defaults, pageSize: 2, page: 3 });
      expect(last.items).toHaveLength(1);

      // Filtering changes the page, not the account totals.
      const filtered = await service.listTransactions(user, { ...defaults, side: "buy" });
      expect(filtered.totals).toEqual({ completedCount: 5, bought: 10_000 + 20_000 + 10_000, sold: 5_000 + 8_000, realizedPnl: 0 });
    });

    it("falls back to the last page when the requested page is past the end", async () => {
      const result = await service.listTransactions(user, { ...defaults, pageSize: 2, page: 99 });
      expect(result.page).toBe(3);
      expect(result.items).toHaveLength(1);
    });

    it("returns an empty page and zero totals for an account without transactions", async () => {
      const result = await service.listTransactions(newUser(), defaults);
      expect(result).toMatchObject({ items: [], total: 0, totalPages: 1, totals: { completedCount: 0, bought: 0, sold: 0, realizedPnl: 0 } });
    });

    it("never shows another user's transactions", async () => {
      const result = await service.listTransactions(newUser(), { ...defaults, search: "bitcoin" });
      expect(result.total).toBe(0);
    });
  });

  describe("watchlist", () => {
    it("starts with the default coins and default sort", async () => {
      expect(await watchlist.getWatchlist(newUser())).toEqual({
        coinIds: ["bitcoin", "ethereum", "solana", "chainlink"],
        sort: { key: "rank", direction: "asc" },
      });
    });

    it("adds coins at the end without duplicates", async () => {
      const user = newUser();
      await watchlist.addCoin(user, "dogecoin");
      const result = await watchlist.addCoin(user, "dogecoin");
      expect(result.coinIds).toEqual(["bitcoin", "ethereum", "solana", "chainlink", "dogecoin"]);
    });

    it("removes a coin and keeps the removal across reads", async () => {
      const user = newUser();
      await watchlist.removeCoin(user, "ethereum");
      expect((await watchlist.getWatchlist(user)).coinIds).toEqual(["bitcoin", "solana", "chainlink"]);
    });

    it("an emptied watchlist stays empty and does not get the defaults back", async () => {
      const user = newUser();
      await watchlist.clear(user);
      expect((await watchlist.getWatchlist(user)).coinIds).toEqual([]);
    });

    it("adding to a brand-new account keeps the defaults too", async () => {
      const user = newUser();
      const result = await watchlist.addCoin(user, "cardano");
      expect(result.coinIds).toHaveLength(5);
    });

    it("remembers the sort order", async () => {
      const user = newUser();
      await watchlist.setSort(user, { key: "marketCap", direction: "desc" });
      expect((await watchlist.getWatchlist(user)).sort).toEqual({ key: "marketCap", direction: "desc" });
    });

    it("keeps users apart", async () => {
      const a = newUser();
      await watchlist.clear(a);
      expect((await watchlist.getWatchlist(newUser())).coinIds).toHaveLength(4);
    });

    it("creates one document when the first requests arrive together", async () => {
      const user = newUser();
      await Promise.all(Array.from({ length: 8 }, () => watchlist.getWatchlist(user)));
      expect(await Watchlist.countDocuments({ userId: new Types.ObjectId(user) })).toBe(1);
    });

    it("stops at the size limit but still accepts a coin that is already there", async () => {
      const user = newUser();
      await watchlist.clear(user);
      for (let index = 0; index < MAX_WATCHLIST_COINS; index += 1) await watchlist.addCoin(user, `coin-${index}`);

      await expect(watchlist.addCoin(user, "one-too-many")).rejects.toMatchObject({ statusCode: 409 });
      const again = await watchlist.addCoin(user, "coin-5");
      expect(again.coinIds).toHaveLength(MAX_WATCHLIST_COINS);
    });
  });
});
