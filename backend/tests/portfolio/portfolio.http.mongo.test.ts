// Full HTTP flow (JWT, routers, validation, services, real MongoDB) with a fixed price feed instead of CoinGecko.
// Runs only when MONGODB_TEST_URI is set, like portfolio.mongo.test.ts.

import express from "express";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-for-cryptoverse";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-for-cryptoverse";

const uri = process.env.MONGODB_TEST_URI;

const { generateTokens } = await import("../../src/modules/auth/jwt.service.js");
const { authenticate } = await import("../../src/modules/auth/auth.middleware.js");
const { errorHandler } = await import("../../src/middlewares/error.middleware.js");
const { MongoPortfolioRepository, PortfolioService, createPortfolioRouter, createTransactionsRouter } = await import("../../src/modules/portfolio/index.js");
const { MongoWatchlistRepository, WatchlistService, createWatchlistRouter } = await import("../../src/modules/watchlist/index.js");
const { default: Transaction } = await import("../../src/modules/portfolio/transaction.model.js");
const { default: Portfolio } = await import("../../src/modules/portfolio/portfolio.model.js");
const { default: Watchlist } = await import("../../src/modules/watchlist/watchlist.model.js");
const { fixedQuotes } = await import("./fakes.js");

const quotes = fixedQuotes({ bitcoin: { symbol: "BTC", name: "Bitcoin", price: 10_000 } });

function tokenFor(userId: string): string {
  return `Bearer ${generateTokens({ userId, role: "user" }).accessToken}`;
}

describe.skipIf(!uri)("HTTP flow on a real MongoDB", () => {
  const dbName = `cryptoverse_http_test_${Date.now()}`;
  const portfolioService = new PortfolioService(new MongoPortfolioRepository(), quotes);
  const api = express();
  api.use(express.json());
  api.use("/portfolio", createPortfolioRouter({ guard: authenticate, service: portfolioService }));
  api.use("/transactions", createTransactionsRouter({ guard: authenticate, service: portfolioService }));
  api.use("/watchlist", createWatchlistRouter({ guard: authenticate, service: new WatchlistService(new MongoWatchlistRepository()) }));
  api.use(errorHandler);

  beforeAll(async () => {
    await mongoose.connect(uri as string, { dbName });
    await Promise.all([Transaction.init(), Portfolio.init(), Watchlist.init()]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("buy, sell, list, reset: each user only ever sees their own account", async () => {
    const alice = tokenFor(new Types.ObjectId().toString());
    const bob = tokenFor(new Types.ObjectId().toString());

    const fresh = await request(api).get("/portfolio").set("Authorization", alice);
    expect(fresh.status).toBe(200);
    expect(fresh.body.data).toEqual({ startingBalance: 100_000, cashBalance: 100_000, holdings: [], transactions: [] });

    const bought = await request(api).post("/portfolio/trades").set("Authorization", alice).send({ coinId: "bitcoin", side: "buy", quantity: 2, price: 1 });
    expect(bought.status).toBe(201);
    // The price in the body was ignored: the server's quote (10,000) was used.
    expect(bought.body.data.transaction).toMatchObject({ price: 10_000, total: 20_000, side: "buy" });
    expect(bought.body.data.portfolio.cashBalance).toBe(80_000);

    const tooMuch = await request(api).post("/portfolio/trades").set("Authorization", alice).send({ coinId: "bitcoin", side: "buy", quantity: 100 });
    expect(tooMuch.status).toBe(422);
    expect(tooMuch.body.message).toBe("Insufficient virtual balance for this order.");

    const sold = await request(api).post("/portfolio/trades").set("Authorization", alice).send({ coinId: "bitcoin", side: "sell", quantity: 1 });
    expect(sold.body.data.transaction.realizedPnl).toBe(0);

    const list = await request(api).get("/transactions?pageSize=1&sortBy=date&sortDirection=desc").set("Authorization", alice);
    expect(list.body.data).toMatchObject({ total: 2, totalPages: 2, items: [{ side: "sell" }], totals: { completedCount: 2, bought: 20_000, sold: 10_000 } });

    const bobsView = await request(api).get("/portfolio").set("Authorization", bob);
    expect(bobsView.body.data.transactions).toEqual([]);

    const reset = await request(api).post("/portfolio/reset").set("Authorization", alice);
    expect(reset.body.data).toMatchObject({ cashBalance: 100_000, holdings: [], transactions: [] });
    expect((await request(api).get("/transactions").set("Authorization", alice)).body.data.total).toBe(0);
  });

  it("watchlist: defaults, add, persist across requests, remove, sort, clear", async () => {
    const token = tokenFor(new Types.ObjectId().toString());

    expect((await request(api).get("/watchlist").set("Authorization", token)).body.data.coinIds).toEqual(["bitcoin", "ethereum", "solana", "chainlink"]);
    expect((await request(api).put("/watchlist/coins/dogecoin").set("Authorization", token)).body.data.coinIds).toContain("dogecoin");
    expect((await request(api).delete("/watchlist/coins/ethereum").set("Authorization", token)).body.data.coinIds).toEqual(["bitcoin", "solana", "chainlink", "dogecoin"]);
    expect((await request(api).patch("/watchlist/sort").set("Authorization", token).send({ key: "price", direction: "desc" })).body.data.sort).toEqual({ key: "price", direction: "desc" });

    const reread = await request(api).get("/watchlist").set("Authorization", token);
    expect(reread.body.data).toEqual({ coinIds: ["bitcoin", "solana", "chainlink", "dogecoin"], sort: { key: "price", direction: "desc" } });

    expect((await request(api).delete("/watchlist/coins").set("Authorization", token)).body.data.coinIds).toEqual([]);
  });
});
