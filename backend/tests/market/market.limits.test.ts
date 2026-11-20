// Tests rate limiting: the per-user market limiter, and that the global API limiter still applies elsewhere.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

import { TEST_API_KEY, createProviderFetch } from "./fixtures.js";

// Configures isolated secrets before the JWT-dependent app is imported.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-for-cryptoverse";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-for-cryptoverse";
process.env.COINGECKO_API_KEY = TEST_API_KEY;

const { default: app } = await import("../../src/app.js");
const { generateTokens } = await import("../../src/modules/auth/jwt.service.js");

const tokenFor = (userId: string): string => generateTokens({ userId, role: "user" }).accessToken;

beforeAll(() => {
  // Keep test output readable; morgan prints one line per request.
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

beforeEach(() => {
  vi.stubGlobal("fetch", createProviderFetch().fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.MARKET_RATE_LIMIT_PER_MINUTE;
});

describe("market per-user rate limiter", () => {
  it("answers 429 with Retry-After once a user exceeds the limit, and does not affect other users", async () => {
    process.env.MARKET_RATE_LIMIT_PER_MINUTE = "10";
    const heavy = { Authorization: `Bearer ${tokenFor("heavy-user")}` };
    const other = { Authorization: `Bearer ${tokenFor("other-user")}` };

    for (let i = 0; i < 10; i += 1) {
      const ok = await request(app).get("/api/v1/market/global").set(heavy);
      expect(ok.status).toBe(200);
    }

    const blocked = await request(app).get("/api/v1/market/global").set(heavy);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ success: false, message: "Too many requests. Please slow down.", code: "RATE_LIMITED" });
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThanOrEqual(1);
    expect(Number(blocked.headers["retry-after"])).toBeLessThanOrEqual(60);

    const unaffected = await request(app).get("/api/v1/market/global").set(other);
    expect(unaffected.status).toBe(200);
  });

  it("reads the configured limit on every request", async () => {
    process.env.MARKET_RATE_LIMIT_PER_MINUTE = "10";
    const headers = { Authorization: `Bearer ${tokenFor("tuned-user")}` };
    for (let i = 0; i < 10; i += 1) await request(app).get("/api/v1/market/global").set(headers);

    process.env.MARKET_RATE_LIMIT_PER_MINUTE = "1000";
    const afterRaise = await request(app).get("/api/v1/market/global").set(headers);

    expect(afterRaise.status).toBe(200);
  });

  it("does not let unauthenticated requests consume a user's allowance", async () => {
    process.env.MARKET_RATE_LIMIT_PER_MINUTE = "10";
    for (let i = 0; i < 15; i += 1) {
      const response = await request(app).get("/api/v1/market/global");
      expect(response.status).toBe(401);
    }
    const signedIn = await request(app).get("/api/v1/market/global").set("Authorization", `Bearer ${tokenFor("fresh-user")}`);
    expect(signedIn.status).toBe(200);
  });
});

describe("global API limiter", () => {
  it("skips market requests but still limits every other API route", async () => {
    process.env.MARKET_RATE_LIMIT_PER_MINUTE = "10000";
    const headers = { Authorization: `Bearer ${tokenFor("polling-user")}` };

    // More than the global limit of 100 requests per 15 minutes, all served.
    for (let i = 0; i < 110; i += 1) {
      const response = await request(app).get("/api/v1/market/global").set(headers);
      expect(response.status, `market request ${i + 1}`).toBe(200);
    }

    // Market requests did not use up the global allowance: exactly 100 health checks pass, the 101st is limited.
    for (let i = 0; i < 100; i += 1) {
      const response = await request(app).get("/api/v1/health");
      expect(response.status, `health request ${i + 1}`).toBe(200);
    }
    const limited = await request(app).get("/api/v1/health");
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ success: false, message: "Too many requests. Please try again later." });
  });
});
