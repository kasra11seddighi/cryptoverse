// Tests the market routes through the real Express app: authentication, validation, error handling, and API key safety.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express from "express";
import type { NextFunction, Request, Response } from "express";

import { TEST_API_KEY, createProviderFetch, jsonResponse } from "./fixtures.js";

// Replaces database-dependent services; routes, middleware and the error handler stay real.
const mocks = vi.hoisted(() => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  getUserById: vi.fn(),
  refreshSession: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock("../../src/modules/users/user.service.js", () => ({
  registerUser: mocks.registerUser,
  loginUser: mocks.loginUser,
  getUserById: mocks.getUserById,
}));

vi.mock("../../src/modules/auth/auth.service.js", () => ({
  refreshSession: mocks.refreshSession,
  revokeSession: mocks.revokeSession,
}));

// Configures isolated secrets before the JWT-dependent app is imported.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-for-cryptoverse";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-for-cryptoverse";
process.env.COINGECKO_API_KEY = TEST_API_KEY;

// Loads a fresh app per test so the in-memory market cache never leaks between tests.
async function loadApp() {
  vi.resetModules();
  const { default: app } = await import("../../src/app.js");
  const { generateTokens } = await import("../../src/modules/auth/jwt.service.js");
  return {
    app,
    accessToken: (userId = "user-1") => generateTokens({ userId, role: "user" }).accessToken,
    refreshToken: () => generateTokens({ userId: "user-1", role: "user" }).refreshToken,
  };
}

const ENDPOINTS = [
  "/api/v1/market/coins",
  "/api/v1/market/coins/bitcoin",
  "/api/v1/market/coins/bitcoin/chart",
  "/api/v1/market/global",
  "/api/v1/market/search?query=btc",
  "/api/v1/market/trending",
  "/api/v1/market/prices?ids=bitcoin",
];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.COINGECKO_API_KEY = TEST_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("market authentication", () => {
  it.each(ENDPOINTS)("rejects unauthenticated GET %s with 401 and never calls CoinGecko", async (path) => {
    const provider = createProviderFetch();
    vi.stubGlobal("fetch", provider.fetch);
    const { app } = await loadApp();

    const response = await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: "Authentication required" });
    expect(provider.fetch).not.toHaveBeenCalled();
  });

  it("rejects a malformed token and a refresh token used as an access token", async () => {
    const provider = createProviderFetch();
    vi.stubGlobal("fetch", provider.fetch);
    const { app, refreshToken } = await loadApp();

    const garbage = await request(app).get("/api/v1/market/global").set("Authorization", "Bearer not-a-jwt");
    const wrongType = await request(app).get("/api/v1/market/global").set("Authorization", `Bearer ${refreshToken()}`);

    expect(garbage.status).toBe(401);
    expect(wrongType.status).toBe(401);
    expect(provider.fetch).not.toHaveBeenCalled();
  });
});

describe("market success responses", () => {
  it("serves every endpoint with the standard envelope", async () => {
    const provider = createProviderFetch();
    vi.stubGlobal("fetch", provider.fetch);
    const { app, accessToken } = await loadApp();
    const auth = { Authorization: `Bearer ${accessToken()}` };

    for (const path of ENDPOINTS) {
      const response = await request(app).get(path).set(auth);
      expect(response.status, path).toBe(200);
      expect(response.body, path).toMatchObject({ success: true, message: "OK", meta: { stale: false } });
      expect(typeof response.body.meta.fetchedAt).toBe("string");
      expect(response.body.data, path).toBeDefined();
    }
  });

  it("returns the documented data shapes", async () => {
    vi.stubGlobal("fetch", createProviderFetch().fetch);
    const { app, accessToken } = await loadApp();
    const auth = { Authorization: `Bearer ${accessToken()}` };

    const coins = await request(app).get("/api/v1/market/coins?pageSize=2&sortBy=price&sortDirection=desc").set(auth);
    expect(coins.body.data.items.map((coin: { id: string }) => coin.id)).toEqual(["bitcoin", "ethereum"]);
    expect(coins.body.data).toMatchObject({ total: 4, page: 1, pageSize: 2, totalPages: 2 });

    const byIds = await request(app).get("/api/v1/market/coins?ids=solana,bitcoin").set(auth);
    expect(byIds.body.data.items.map((coin: { id: string }) => coin.id)).toEqual(["solana", "bitcoin"]);

    const detail = await request(app).get("/api/v1/market/coins/Bitcoin").set(auth);
    expect(detail.body.data).toMatchObject({ id: "bitcoin", symbol: "BIT", categories: ["Smart Contract Platform"] });
    expect(detail.body.data.description).not.toMatch(/[<>]/);

    const chart = await request(app).get("/api/v1/market/coins/bitcoin/chart?days=30").set(auth);
    expect(chart.body.data).toMatchObject({ id: "bitcoin", days: "30", effectiveDays: "30", truncated: false });
    expect(chart.body.data.prices).toHaveLength(3);

    const global = await request(app).get("/api/v1/market/global").set(auth);
    expect(global.body.data).toMatchObject({ btcDominance: 52.1, breadth: { gainers: 2, losers: 1, sampleSize: 4 } });

    const search = await request(app).get("/api/v1/market/search?query=bit&limit=1").set(auth);
    expect(search.body.data).toHaveLength(1);
    expect(search.body.data[0]).toMatchObject({ id: "bitcoin", price: 60_000 });

    const trending = await request(app).get("/api/v1/market/trending?limit=1").set(auth);
    expect(trending.body.data).toHaveLength(1);

    const prices = await request(app).get("/api/v1/market/prices?ids=bitcoin,unknown-coin").set(auth);
    expect(prices.body.data).toEqual({ bitcoin: { usd: 1.5, usd24hChange: -0.5 } });
  });

  it("answers 404 JSON for unknown market routes through the global not-found handler", async () => {
    vi.stubGlobal("fetch", createProviderFetch().fetch);
    const { app, accessToken } = await loadApp();

    const response = await request(app).get("/api/v1/market/nope").set("Authorization", `Bearer ${accessToken()}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false });
  });
});

describe("market API key protection", () => {
  it("sends the key to CoinGecko only as a header and never in the URL or the response", async () => {
    const provider = createProviderFetch();
    vi.stubGlobal("fetch", provider.fetch);
    const { app, accessToken } = await loadApp();
    const auth = { Authorization: `Bearer ${accessToken()}` };

    const bodies: string[] = [];
    for (const path of ENDPOINTS) {
      const response = await request(app).get(path).set(auth);
      bodies.push(response.text, JSON.stringify(response.headers));
    }

    expect(provider.calls.length).toBeGreaterThan(0);
    for (const call of provider.calls) {
      expect(call.headers.get("x-cg-demo-api-key")).toBe(TEST_API_KEY);
      expect(call.url.href).not.toContain(TEST_API_KEY);
      expect(call.url.origin).toBe("https://api.coingecko.com");
      expect(call.url.pathname.startsWith("/api/v3/")).toBe(true);
    }
    expect(bodies.join("\n")).not.toContain(TEST_API_KEY);
  });

  it("never logs the key, even when the provider fails", async () => {
    const provider = createProviderFetch({ handler: () => jsonResponse({ error: `bad key ${TEST_API_KEY}` }, { status: 401 }) });
    vi.stubGlobal("fetch", provider.fetch);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { app, accessToken } = await loadApp();

    const response = await request(app).get("/api/v1/market/global").set("Authorization", `Bearer ${accessToken()}`);

    expect(response.status).toBe(502);
    expect(response.text).not.toContain(TEST_API_KEY);
    const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls, ...log.mock.calls]);
    expect(logged).not.toContain(TEST_API_KEY);
  });

  it("answers 503 and sends nothing to CoinGecko when the key is not configured", async () => {
    const provider = createProviderFetch();
    vi.stubGlobal("fetch", provider.fetch);
    const { app, accessToken } = await loadApp();
    delete process.env.COINGECKO_API_KEY;

    const response = await request(app).get("/api/v1/market/global").set("Authorization", `Bearer ${accessToken()}`);

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ success: false, code: "NOT_CONFIGURED" });
    expect(provider.fetch).not.toHaveBeenCalled();
  });
});

describe("market validation", () => {
  const BAD_REQUESTS = [
    "/api/v1/market/coins?sortBy=dropTable",
    "/api/v1/market/coins?sortDirection=sideways",
    "/api/v1/market/coins?page=0",
    "/api/v1/market/coins?pageSize=251",
    "/api/v1/market/coins?page=1&page=2",
    `/api/v1/market/coins?search=${"x".repeat(65)}`,
    `/api/v1/market/coins?ids=${Array.from({ length: 101 }, (_, i) => `c${i}`).join(",")}`,
    "/api/v1/market/coins?ids=bitcoin,../etc",
    "/api/v1/market/coins/bit%20coin",
    `/api/v1/market/coins/${"a".repeat(101)}`,
    "/api/v1/market/coins/bitcoin/chart?days=2",
    "/api/v1/market/search",
    "/api/v1/market/search?query=%20%20",
    `/api/v1/market/search?query=${"x".repeat(65)}`,
    "/api/v1/market/search?query=btc&limit=11",
    "/api/v1/market/trending?limit=16",
    "/api/v1/market/prices",
    "/api/v1/market/prices?ids=",
  ];

  it.each(BAD_REQUESTS)("rejects %s with 400 VALIDATION_ERROR and does not call CoinGecko", async (path) => {
    const provider = createProviderFetch();
    vi.stubGlobal("fetch", provider.fetch);
    const { app, accessToken } = await loadApp();

    const response = await request(app).get(path).set("Authorization", `Bearer ${accessToken()}`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
    expect(typeof response.body.message).toBe("string");
    expect(provider.fetch).not.toHaveBeenCalled();
  });
});

describe("market provider error handling", () => {
  it("passes provider rate limits on as 429 with Retry-After and no provider details", async () => {
    const provider = createProviderFetch({
      handler: () => new Response(JSON.stringify({ status: { error_message: "internal plan detail" } }), { status: 429, headers: { "retry-after": "17" } }),
    });
    vi.stubGlobal("fetch", provider.fetch);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { app, accessToken } = await loadApp();
    const auth = { Authorization: `Bearer ${accessToken()}` };

    const first = await request(app).get("/api/v1/market/trending").set(auth);
    expect(first.status).toBe(429);
    expect(first.headers["retry-after"]).toBe("17");
    expect(first.body).toMatchObject({ success: false, code: "RATE_LIMITED" });
    expect(first.text).not.toContain("internal plan detail");

    // While paused, no further requests reach the provider.
    const second = await request(app).get("/api/v1/market/global").set(auth);
    expect(second.status).toBe(429);
    expect(Number(second.headers["retry-after"])).toBeGreaterThan(0);
    expect(provider.fetch).toHaveBeenCalledTimes(1);
  });

  it("hides provider failures behind a generic 502", async () => {
    const provider = createProviderFetch({ handler: () => new Response("Traceback: database password=hunter2", { status: 500 }) });
    vi.stubGlobal("fetch", provider.fetch);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { app, accessToken } = await loadApp();

    const response = await request(app).get("/api/v1/market/global").set("Authorization", `Bearer ${accessToken()}`);

    expect(response.status).toBe(502);
    expect(response.body.code).toBe("UPSTREAM_ERROR");
    expect(response.text).not.toContain("hunter2");
    expect(response.text).not.toContain("Traceback");
  });

  it("returns 404 for a coin CoinGecko does not know", async () => {
    const provider = createProviderFetch({ handler: (url) => (url.pathname.endsWith("/coins/ghost-coin") ? new Response("{}", { status: 404 }) : undefined) });
    vi.stubGlobal("fetch", provider.fetch);
    const { app, accessToken } = await loadApp();

    const response = await request(app).get("/api/v1/market/coins/ghost-coin").set("Authorization", `Bearer ${accessToken()}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, code: "NOT_FOUND" });
  });

  it("returns 504 when CoinGecko does not answer in time", async () => {
    process.env.COINGECKO_TIMEOUT_MS = "1000";
    const provider = createProviderFetch({
      handler: (_url, init) =>
        new Promise<globalThis.Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abort = new Error("aborted");
            abort.name = "AbortError";
            reject(abort);
          });
        }),
    });
    vi.stubGlobal("fetch", provider.fetch);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { app, accessToken } = await loadApp();

    try {
      const response = await request(app).get("/api/v1/market/global").set("Authorization", `Bearer ${accessToken()}`);
      expect(response.status).toBe(504);
      expect(response.body.code).toBe("UPSTREAM_TIMEOUT");
    } finally {
      delete process.env.COINGECKO_TIMEOUT_MS;
    }
  }, 10_000);
});

describe("market and global error handlers working together", () => {
  async function buildApp(service: unknown, withUser = true) {
    const { createMarketRouter } = await import("../../src/modules/market/index.js");
    const { errorHandler } = await import("../../src/middlewares/error.middleware.js");
    const { notFoundHandler } = await import("../../src/middlewares/not-found.middleware.js");
    const guard = (req: Request, _res: Response, next: NextFunction): void => {
      if (withUser) req.user = { userId: "user-1", role: "user" };
      next();
    };
    const app = express();
    app.use("/api/v1/market", createMarketRouter({ guard, service: service as never }));
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  }

  it("turns unexpected (non-market) errors into a generic 500 via the global handler", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = await buildApp({
      getGlobal: async () => {
        throw new Error("mongodb://admin:hunter2@internal-host leaked");
      },
    });

    const response = await request(app).get("/api/v1/market/global");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: "Internal server error" });
    expect(response.text).not.toContain("hunter2");
    expect(consoleError).toHaveBeenCalled();
  });

  it("lets the global handler format a MarketError that escapes the market router", async () => {
    const { MarketError } = await import("../../src/modules/market/market.errors.js");
    const { errorHandler } = await import("../../src/middlewares/error.middleware.js");
    const app = express();
    app.get("/boom", () => {
      throw new MarketError("Safe market message", 502, "UPSTREAM_ERROR");
    });
    app.use(errorHandler);

    const response = await request(app).get("/boom");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ success: false, message: "Safe market message" });
  });

  it("returns stale data with meta.stale=true over HTTP when CoinGecko fails after the TTL", async () => {
    const { MarketService, MAX_STALE_MS, CACHE_TTL_MS } = await import("../../src/modules/market/market.service.js");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    let clock = 5_000_000;
    let failing = false;
    const provider = createProviderFetch({
      handler: () => (failing ? new Response("", { status: 500 }) : undefined),
    });
    vi.stubGlobal("fetch", provider.fetch);
    const service = new MarketService({ now: () => clock });
    const app = await buildApp(service);

    const fresh = await request(app).get("/api/v1/market/trending");
    expect(fresh.body.meta.stale).toBe(false);

    failing = true;
    clock += CACHE_TTL_MS.trending + 1;
    const stale = await request(app).get("/api/v1/market/trending");
    expect(stale.status).toBe(200);
    expect(stale.body.meta).toEqual({ fetchedAt: fresh.body.meta.fetchedAt, stale: true });
    expect(stale.body.data).toEqual(fresh.body.data);

    clock += MAX_STALE_MS + 1;
    const expired = await request(app).get("/api/v1/market/trending");
    expect(expired.status).toBe(502);
    expect(expired.body.code).toBe("UPSTREAM_ERROR");
  });

  it("blocks every market route when the authentication guard rejects the request", async () => {
    const { createMarketRouter } = await import("../../src/modules/market/index.js");
    const { authenticate } = await import("../../src/modules/auth/auth.middleware.js");
    const { errorHandler } = await import("../../src/middlewares/error.middleware.js");
    const service = { getGlobal: vi.fn() };
    const app = express();
    app.use("/m", createMarketRouter({ guard: authenticate, service: service as never }));
    app.use(errorHandler);

    const response = await request(app).get("/m/global");

    expect(response.status).toBe(401);
    expect(service.getGlobal).not.toHaveBeenCalled();
  });
});

describe("regression: existing endpoints are unaffected", () => {
  it("keeps the health check public", async () => {
    const { app } = await loadApp();
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, message: "CryptoVerse API is running" });
  });

  it("keeps /users/me protected and working", async () => {
    mocks.getUserById.mockResolvedValue({ id: "user-1", name: "T", email: "t@example.com", role: "user", createdAt: new Date("2026-01-01") });
    const { app, accessToken } = await loadApp();

    const anonymous = await request(app).get("/api/v1/users/me");
    const signedIn = await request(app).get("/api/v1/users/me").set("Authorization", `Bearer ${accessToken()}`);

    expect(anonymous.status).toBe(401);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.data.email).toBe("t@example.com");
  });

  it("keeps login and registration working", async () => {
    mocks.registerUser.mockResolvedValue({ id: "u", name: "T", email: "t@example.com", role: "user", createdAt: new Date() });
    mocks.loginUser.mockResolvedValue({ accessToken: "a", refreshToken: "r", user: { id: "u" } });
    const { app } = await loadApp();

    const register = await request(app).post("/api/v1/users/register").send({ name: "Test User", email: "t@example.com", password: "TestPassword123!" });
    const login = await request(app).post("/api/v1/auth/login").send({ email: "t@example.com", password: "TestPassword123!" });

    expect(register.status).toBe(201);
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeDefined();
  });
});
