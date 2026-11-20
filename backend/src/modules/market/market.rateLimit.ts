// Limits how often each signed-in user can call the market endpoints so unique requests cannot drain the CoinGecko budget.

import type { Request, RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { getMarketConfig } from "./market.config.js";

const WINDOW_MS = 60_000;

/**
 * Per-user limiter (falls back to the client IP) built on the project's existing express-rate-limit
 * dependency. The ceiling is read from MARKET_RATE_LIMIT_PER_MINUTE on every request.
 * The counters live in this process; behind a reverse proxy enable Express "trust proxy" so
 * `req.ip` is the client address. Several server instances would each keep their own counters.
 */
export function createMarketRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: () => getMarketConfig().clientRateLimitPerMinute,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req: Request): string => req.user?.userId ?? ipKeyGenerator(req.ip ?? "unknown"),
    handler: (req, res) => {
      // Tell the client how long to wait, using the limiter's own reset time.
      const info = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit;
      const resetAt = info?.resetTime?.getTime() ?? Date.now() + WINDOW_MS;
      const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down.",
        code: "RATE_LIMITED",
      });
    },
  });
}
