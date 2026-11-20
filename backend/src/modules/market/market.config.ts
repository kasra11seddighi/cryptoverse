// Reads market and CoinGecko settings from environment variables.

export interface MarketConfig {
  /** CoinGecko Demo API key (x-cg-demo-api-key). Null when not configured. */
  apiKey: string | null;
  baseUrl: string;
  timeoutMs: number;
  /** Ceiling for requests this server sends to CoinGecko per rolling minute. */
  maxRequestsPerMinute: number;
  /** How many top coins (by market cap) the cached market universe holds. CoinGecko allows at most 250 per page. */
  listSize: number;
  /** Per-IP ceiling for requests to the market endpoints per minute. */
  clientRateLimitPerMinute: number;
}

const DEFAULT_BASE_URL = "https://api.coingecko.com/api/v3";

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/** Read lazily so tests and late dotenv loading both work. The key never leaves this module except in the request header. */
export function getMarketConfig(): MarketConfig {
  const apiKey = process.env.COINGECKO_API_KEY?.trim();
  const baseUrl = (process.env.COINGECKO_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");

  return {
    apiKey: apiKey ? apiKey : null,
    baseUrl,
    timeoutMs: readInt("COINGECKO_TIMEOUT_MS", 8000, 1000, 30000),
    maxRequestsPerMinute: readInt("COINGECKO_MAX_REQUESTS_PER_MINUTE", 25, 1, 500),
    listSize: readInt("MARKET_LIST_SIZE", 250, 10, 250),
    clientRateLimitPerMinute: readInt("MARKET_RATE_LIMIT_PER_MINUTE", 120, 10, 10000),
  };
}
