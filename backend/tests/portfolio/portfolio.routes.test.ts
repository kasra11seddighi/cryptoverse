// Tests the portfolio, transaction and watchlist HTTP layer: authentication, validation, status codes and response shape.

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-for-cryptoverse";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-for-cryptoverse";

const { default: app } = await import("../../src/app.js");
const { generateTokens } = await import("../../src/modules/auth/jwt.service.js");
const { authenticate } = await import("../../src/modules/auth/auth.middleware.js");
const { errorHandler } = await import("../../src/middlewares/error.middleware.js");
const { createPortfolioRouter, createTransactionsRouter } = await import("../../src/modules/portfolio/index.js");
const { createWatchlistRouter } = await import("../../src/modules/watchlist/index.js");
const { AppError } = await import("../../src/shared/errors/AppError.js");

const bearer = `Bearer ${generateTokens({ userId: "507f1f77bcf86cd799439011", role: "user" }).accessToken}`;

const portfolio = { startingBalance: 100_000, cashBalance: 100_000, holdings: [], transactions: [] };
const watchlist = { coinIds: ["bitcoin"], sort: { key: "rank", direction: "asc" } };

const portfolioService = {
  getPortfolio: vi.fn(),
  trade: vi.fn(),
  reset: vi.fn(),
  listTransactions: vi.fn(),
};
const watchlistService = {
  getWatchlist: vi.fn(),
  addCoin: vi.fn(),
  removeCoin: vi.fn(),
  clear: vi.fn(),
  setSort: vi.fn(),
};

function buildApp() {
  const test = express();
  test.use(express.json());
  test.use("/portfolio", createPortfolioRouter({ guard: authenticate, service: portfolioService as never }));
  test.use("/transactions", createTransactionsRouter({ guard: authenticate, service: portfolioService as never }));
  test.use("/watchlist", createWatchlistRouter({ guard: authenticate, service: watchlistService as never }));
  test.use(errorHandler);
  return test;
}
const api = buildApp();

beforeEach(() => {
  vi.clearAllMocks();
  portfolioService.getPortfolio.mockResolvedValue(portfolio);
  portfolioService.trade.mockResolvedValue({ portfolio, transaction: { id: "t1" } });
  portfolioService.reset.mockResolvedValue(portfolio);
  portfolioService.listTransactions.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1, totals: { completedCount: 0, bought: 0, sold: 0, realizedPnl: 0 } });
  watchlistService.getWatchlist.mockResolvedValue(watchlist);
  watchlistService.addCoin.mockResolvedValue(watchlist);
  watchlistService.removeCoin.mockResolvedValue(watchlist);
  watchlistService.clear.mockResolvedValue({ ...watchlist, coinIds: [] });
  watchlistService.setSort.mockResolvedValue(watchlist);
});

describe("authentication on the real application", () => {
  it.each([
    ["get", "/api/v1/portfolio"],
    ["post", "/api/v1/portfolio/trades"],
    ["post", "/api/v1/portfolio/reset"],
    ["get", "/api/v1/transactions"],
    ["get", "/api/v1/watchlist"],
    ["put", "/api/v1/watchlist/coins/bitcoin"],
    ["delete", "/api/v1/watchlist/coins/bitcoin"],
    ["delete", "/api/v1/watchlist/coins"],
    ["patch", "/api/v1/watchlist/sort"],
  ] as const)("%s %s answers 401 without an access token", async (method, path) => {
    const response = await request(app)[method](path);
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe("GET /portfolio", () => {
  it("returns the account of the signed-in user", async () => {
    const response = await request(api).get("/portfolio").set("Authorization", bearer);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "OK", data: portfolio });
    expect(portfolioService.getPortfolio).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
  });
});

describe("POST /portfolio/trades", () => {
  const send = (body: unknown) => request(api).post("/portfolio/trades").set("Authorization", bearer).send(body as object);

  it("passes a valid order to the service and answers 201", async () => {
    const response = await send({ coinId: " Bitcoin ", side: "buy", quantity: 0.5 });
    expect(response.status).toBe(201);
    expect(portfolioService.trade).toHaveBeenCalledWith("507f1f77bcf86cd799439011", { coinId: "bitcoin", side: "buy", quantity: 0.5 });
  });

  it("never passes a client-supplied price on", async () => {
    await send({ coinId: "bitcoin", side: "buy", quantity: 1, price: 0.01 });
    expect(portfolioService.trade.mock.calls[0]?.[1]).toEqual({ coinId: "bitcoin", side: "buy", quantity: 1 });
  });

  it.each([
    ["a missing side", { coinId: "bitcoin", quantity: 1 }],
    ["an unknown side", { coinId: "bitcoin", side: "hold", quantity: 1 }],
    ["a zero quantity", { coinId: "bitcoin", side: "buy", quantity: 0 }],
    ["a negative quantity", { coinId: "bitcoin", side: "buy", quantity: -2 }],
    ["a quantity sent as text", { coinId: "bitcoin", side: "buy", quantity: "1" }],
    ["more than 8 decimals", { coinId: "bitcoin", side: "buy", quantity: 0.123456789 }],
    ["an absurd quantity", { coinId: "bitcoin", side: "buy", quantity: 1e15 }],
    ["an invalid coin id", { coinId: "../etc/passwd", side: "buy", quantity: 1 }],
    ["a missing coin id", { side: "buy", quantity: 1 }],
  ])("rejects %s with 400 before reaching the service", async (_name, body) => {
    const response = await send(body);
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(portfolioService.trade).not.toHaveBeenCalled();
  });

  it("accepts a quantity with exactly 8 decimals", async () => {
    expect((await send({ coinId: "bitcoin", side: "buy", quantity: 0.12345678 })).status).toBe(201);
  });

  it("shows the service's business error and status", async () => {
    portfolioService.trade.mockRejectedValueOnce(new AppError("Insufficient virtual balance for this order.", 422));
    const response = await send({ coinId: "bitcoin", side: "buy", quantity: 1 });
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ success: false, message: "Insufficient virtual balance for this order." });
  });
});

describe("POST /portfolio/reset", () => {
  it("resets the account of the signed-in user", async () => {
    const response = await request(api).post("/portfolio/reset").set("Authorization", bearer);
    expect(response.status).toBe(200);
    expect(portfolioService.reset).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
  });
});

describe("GET /transactions", () => {
  const get = (query: string) => request(api).get(`/transactions${query}`).set("Authorization", bearer);

  it("applies the documented defaults", async () => {
    await get("");
    expect(portfolioService.listTransactions).toHaveBeenCalledWith("507f1f77bcf86cd799439011", {
      page: 1, pageSize: 10, search: "", side: "all", status: "all", sortBy: "date", sortDirection: "desc",
    });
  });

  it("parses filters, sorting and paging from the query string", async () => {
    await get("?page=3&pageSize=25&search=%20eth%20&side=sell&status=completed&sortBy=total&sortDirection=asc");
    expect(portfolioService.listTransactions.mock.calls[0]?.[1]).toEqual({
      page: 3, pageSize: 25, search: "eth", side: "sell", status: "completed", sortBy: "total", sortDirection: "asc",
    });
  });

  it.each(["?page=0", "?page=abc", "?pageSize=101", "?side=hold", "?status=lost", "?sortBy=password", "?sortDirection=up", "?search=" + "x".repeat(65), "?side=buy&side=sell"])(
    "rejects %s with 400",
    async (query) => {
      const response = await get(query);
      expect(response.status).toBe(400);
      expect(portfolioService.listTransactions).not.toHaveBeenCalled();
    },
  );
});

describe("watchlist routes", () => {
  const user = "507f1f77bcf86cd799439011";

  it("GET returns the watchlist", async () => {
    const response = await request(api).get("/watchlist").set("Authorization", bearer);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(watchlist);
  });

  it("PUT adds a coin with a normalised id", async () => {
    const response = await request(api).put("/watchlist/coins/Solana").set("Authorization", bearer);
    expect(response.status).toBe(200);
    expect(watchlistService.addCoin).toHaveBeenCalledWith(user, "solana");
  });

  it("DELETE removes a coin", async () => {
    await request(api).delete("/watchlist/coins/solana").set("Authorization", bearer);
    expect(watchlistService.removeCoin).toHaveBeenCalledWith(user, "solana");
  });

  it("DELETE on the collection clears the watchlist", async () => {
    const response = await request(api).delete("/watchlist/coins").set("Authorization", bearer);
    expect(response.status).toBe(200);
    expect(watchlistService.clear).toHaveBeenCalledWith(user);
  });

  it("rejects an invalid coin id", async () => {
    const response = await request(api).put("/watchlist/coins/bad%20id").set("Authorization", bearer);
    expect(response.status).toBe(400);
    expect(watchlistService.addCoin).not.toHaveBeenCalled();
  });

  it("PATCH saves a valid sort order", async () => {
    const response = await request(api).patch("/watchlist/sort").set("Authorization", bearer).send({ key: "price", direction: "desc" });
    expect(response.status).toBe(200);
    expect(watchlistService.setSort).toHaveBeenCalledWith(user, { key: "price", direction: "desc" });
  });

  it.each([{ key: "password", direction: "asc" }, { key: "price", direction: "sideways" }, { key: "price" }, {}])("PATCH rejects the sort %j", async (body) => {
    const response = await request(api).patch("/watchlist/sort").set("Authorization", bearer).send(body);
    expect(response.status).toBe(400);
    expect(watchlistService.setSort).not.toHaveBeenCalled();
  });

  it("answers 409 when the watchlist is full", async () => {
    watchlistService.addCoin.mockRejectedValueOnce(new AppError("The watchlist is limited to 100 coins.", 409));
    const response = await request(api).put("/watchlist/coins/solana").set("Authorization", bearer);
    expect(response.status).toBe(409);
  });
});
