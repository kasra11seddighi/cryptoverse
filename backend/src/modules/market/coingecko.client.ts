// Sends authenticated, time-limited, budgeted requests to CoinGecko and converts every failure into a safe MarketError.

import { getMarketConfig } from "./market.config.js";
import type { MarketConfig } from "./market.config.js";
import { MarketError } from "./market.errors.js";

export type QueryValue = string | number | boolean | undefined;

export interface ClientLogger {
  warn(message: string): void;
}

export interface CoinGeckoClientOptions {
  getConfig?: () => MarketConfig;
  fetchImpl?: typeof fetch;
  now?: () => number;
  logger?: ClientLogger;
}

const WINDOW_MS = 60_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const MAX_RETRY_AFTER_SECONDS = 3600;

function parseRetryAfter(header: string | null): number {
  const seconds = header === null ? Number.NaN : Number.parseInt(header, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_RETRY_AFTER_SECONDS;
  return Math.min(seconds, MAX_RETRY_AFTER_SECONDS);
}

/**
 * Minimal CoinGecko HTTP client. It
 *  - sends the Demo API key only as the `x-cg-demo-api-key` header,
 *  - enforces a timeout,
 *  - keeps its own per-minute request budget so we never hammer the provider,
 *  - stops calling for the advertised Retry-After period after an HTTP 429 (no retries, no loops),
 *  - turns every failure into a MarketError whose message contains no secrets or provider internals.
 */
export class CoinGeckoClient {
  private readonly callTimes: number[] = [];
  private blockedUntil = 0;
  private readonly getConfig: () => MarketConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly logger: ClientLogger;

  constructor(options: CoinGeckoClientOptions = {}) {
    this.getConfig = options.getConfig ?? getMarketConfig;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? Date.now;
    this.logger = options.logger ?? console;
  }

  async get(path: string, query: Record<string, QueryValue> = {}): Promise<unknown> {
    const config = this.getConfig();
    if (!config.apiKey) {
      throw new MarketError("Market data is not configured on the server.", 503, "NOT_CONFIGURED");
    }

    this.assertWithinBudget(config.maxRequestsPerMinute);

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const queryString = params.toString();
    const url = `${config.baseUrl}${path}${queryString ? `?${queryString}` : ""}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json", "x-cg-demo-api-key": config.apiKey },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new MarketError("The market data provider took too long to respond.", 504, "UPSTREAM_TIMEOUT");
      }
      this.logger.warn(`[market] request to ${path} failed: network error`);
      throw new MarketError("Could not reach the market data provider.", 502, "UPSTREAM_ERROR");
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      this.blockedUntil = this.now() + retryAfter * 1000;
      this.logger.warn(`[market] provider rate limit hit on ${path}; pausing upstream calls for ${retryAfter}s`);
      throw new MarketError("Market data is temporarily rate limited. Please try again shortly.", 429, "RATE_LIMITED", retryAfter);
    }
    if (response.status === 404) {
      throw new MarketError("The requested market data was not found.", 404, "NOT_FOUND");
    }
    if (response.status === 401 || response.status === 403 || response.status === 400) {
      // Covers an invalid key and plan restrictions (for example a history range the plan does not include).
      this.logger.warn(`[market] provider rejected ${path} with status ${response.status}`);
      throw new MarketError("The market data provider rejected the request.", 502, "UPSTREAM_REJECTED");
    }
    if (!response.ok) {
      this.logger.warn(`[market] provider returned status ${response.status} for ${path}`);
      throw new MarketError("The market data provider is unavailable right now.", 502, "UPSTREAM_ERROR");
    }

    try {
      return (await response.json()) as unknown;
    } catch {
      throw new MarketError("The market data provider returned an unreadable response.", 502, "UPSTREAM_ERROR");
    }
  }

  private assertWithinBudget(maxPerMinute: number): void {
    const now = this.now();

    if (this.blockedUntil > now) {
      const wait = Math.ceil((this.blockedUntil - now) / 1000);
      throw new MarketError("Market data is temporarily rate limited. Please try again shortly.", 429, "RATE_LIMITED", wait);
    }

    while (this.callTimes.length > 0 && now - (this.callTimes[0] ?? now) >= WINDOW_MS) this.callTimes.shift();
    if (this.callTimes.length >= maxPerMinute) {
      const oldest = this.callTimes[0] ?? now;
      const wait = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
      throw new MarketError("Market data is temporarily rate limited. Please try again shortly.", 429, "RATE_LIMITED", wait);
    }
    this.callTimes.push(now);
  }
}
