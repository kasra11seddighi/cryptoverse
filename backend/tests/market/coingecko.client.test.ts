// Tests the CoinGecko client: API key handling, timeouts, Retry-After, request budget, and safe errors.

import { describe, expect, it, vi } from "vitest";

import { CoinGeckoClient } from "../../src/modules/market/coingecko.client.js";
import type { ClientLogger } from "../../src/modules/market/coingecko.client.js";
import type { MarketConfig } from "../../src/modules/market/market.config.js";
import { MarketError } from "../../src/modules/market/market.errors.js";
import { TEST_API_KEY, jsonResponse } from "./fixtures.js";

const baseConfig: MarketConfig = {
  apiKey: TEST_API_KEY,
  baseUrl: "https://api.coingecko.com/api/v3",
  timeoutMs: 50,
  maxRequestsPerMinute: 25,
  listSize: 250,
  clientRateLimitPerMinute: 120,
};

function createClient(
  fetchImpl: typeof fetch,
  config: Partial<MarketConfig> = {},
  now: () => number = Date.now,
) {
  const warnings: string[] = [];
  const logger: ClientLogger = { warn: (message) => warnings.push(message) };
  const client = new CoinGeckoClient({ getConfig: () => ({ ...baseConfig, ...config }), fetchImpl, now, logger });
  return { client, warnings };
}

async function catchError(promise: Promise<unknown>): Promise<MarketError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(MarketError);
    return error as MarketError;
  }
  throw new Error("Expected the call to fail");
}

describe("CoinGeckoClient requests", () => {
  it("sends the key only in the x-cg-demo-api-key header and builds the URL from the base URL", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    const { client } = createClient(fetchImpl as unknown as typeof fetch);

    await client.get("/coins/markets", { vs_currency: "usd", per_page: 10, page: 1, sparkline: false, skipped: undefined });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=10&page=1&sparkline=false");
    expect(url).not.toContain(TEST_API_KEY);
    expect((init.headers as Record<string, string>)["x-cg-demo-api-key"]).toBe(TEST_API_KEY);
    expect(init.method).toBe("GET");
  });

  it("answers 503 NOT_CONFIGURED without calling the provider when the key is missing", async () => {
    const fetchImpl = vi.fn();
    const { client } = createClient(fetchImpl as unknown as typeof fetch, { apiKey: null });

    const error = await catchError(client.get("/global"));

    expect(error).toMatchObject({ statusCode: 503, code: "NOT_CONFIGURED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("CoinGeckoClient failures", () => {
  it("times out with 504 UPSTREAM_TIMEOUT", async () => {
    const fetchImpl = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const abort = new Error("This operation was aborted");
          abort.name = "AbortError";
          reject(abort);
        });
      })) as unknown as typeof fetch;
    const { client } = createClient(fetchImpl, { timeoutMs: 20 });

    const error = await catchError(client.get("/global"));

    expect(error).toMatchObject({ statusCode: 504, code: "UPSTREAM_TIMEOUT" });
  });

  it("maps network failures to 502 without leaking the underlying message", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(`connect ECONNREFUSED 10.0.0.5:443 key=${TEST_API_KEY}`);
    });
    const { client, warnings } = createClient(fetchImpl as unknown as typeof fetch);

    const error = await catchError(client.get("/global"));

    expect(error).toMatchObject({ statusCode: 502, code: "UPSTREAM_ERROR" });
    expect(error.message).not.toContain("ECONNREFUSED");
    expect(error.message).not.toContain(TEST_API_KEY);
    expect(warnings.join(" ")).not.toContain(TEST_API_KEY);
    expect(warnings.join(" ")).not.toContain("ECONNREFUSED");
  });

  it.each([
    [404, 404, "NOT_FOUND"],
    [400, 502, "UPSTREAM_REJECTED"],
    [401, 502, "UPSTREAM_REJECTED"],
    [403, 502, "UPSTREAM_REJECTED"],
    [500, 502, "UPSTREAM_ERROR"],
    [503, 502, "UPSTREAM_ERROR"],
  ])("maps provider status %i to %i %s with a generic message", async (providerStatus, status, code) => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: `secret provider detail ${TEST_API_KEY}` }, { status: providerStatus }));
    const { client, warnings } = createClient(fetchImpl as unknown as typeof fetch);

    const error = await catchError(client.get("/coins/bitcoin"));

    expect(error).toMatchObject({ statusCode: status, code });
    expect(error.message).not.toContain("secret provider detail");
    expect(error.message).not.toContain(TEST_API_KEY);
    expect(warnings.join(" ")).not.toContain(TEST_API_KEY);
  });

  it("maps an unreadable body to 502", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>oops</html>", { status: 200 }));
    const { client } = createClient(fetchImpl as unknown as typeof fetch);

    const error = await catchError(client.get("/global"));

    expect(error).toMatchObject({ statusCode: 502, code: "UPSTREAM_ERROR" });
  });
});

describe("CoinGeckoClient rate limiting", () => {
  it("honours Retry-After on HTTP 429 and stops calling the provider during the pause", async () => {
    let clock = 1_000_000;
    const fetchImpl = vi.fn(async () => new Response("slow down", { status: 429, headers: { "retry-after": "7" } }));
    const { client } = createClient(fetchImpl as unknown as typeof fetch, {}, () => clock);

    const first = await catchError(client.get("/global"));
    expect(first).toMatchObject({ statusCode: 429, code: "RATE_LIMITED", retryAfterSeconds: 7 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    clock += 3000;
    const second = await catchError(client.get("/global"));
    expect(second).toMatchObject({ statusCode: 429, code: "RATE_LIMITED", retryAfterSeconds: 4 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    clock += 4000;
    fetchImpl.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(client.get("/global")).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("uses a 60 second default for a missing or invalid Retry-After and caps very large values", async () => {
    for (const [header, expected] of [[null, 60], ["abc", 60], ["0", 60], ["-5", 60], ["999999", 3600]] as const) {
      const headers: Record<string, string> = header === null ? {} : { "retry-after": header };
      const fetchImpl = vi.fn(async () => new Response("", { status: 429, headers }));
      const { client } = createClient(fetchImpl as unknown as typeof fetch);

      const error = await catchError(client.get("/global"));

      expect(error.retryAfterSeconds).toBe(expected);
    }
  });

  it("enforces its own per-minute budget and recovers when the window moves on", async () => {
    let clock = 1_000_000;
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    const { client } = createClient(fetchImpl as unknown as typeof fetch, { maxRequestsPerMinute: 2 }, () => clock);

    await client.get("/a");
    await client.get("/b");
    const blocked = await catchError(client.get("/c"));
    expect(blocked).toMatchObject({ statusCode: 429, code: "RATE_LIMITED" });
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    clock += 60_000;
    await expect(client.get("/c")).resolves.toEqual({ ok: true });
  });
});
