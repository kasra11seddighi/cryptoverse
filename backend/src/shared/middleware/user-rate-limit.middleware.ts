// Builds a per-user rate limiter (falling back to the client IP) for authenticated API areas.

import type { Request, RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const WINDOW_MS = 60_000;

export interface UserRateLimitOptions {
  // Maximum requests per user per minute. Read on every request so tests and operators can change it.
  limit: () => number;
  message?: string;
}

// Reads a positive integer from the environment, or returns the fallback.
export function readLimitFromEnv(name: string, fallback: number): () => number {
  return () => {
    const parsed = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
}

export function createUserRateLimiter(options: UserRateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: options.limit,
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
        message: options.message ?? "Too many requests. Please slow down.",
        code: "RATE_LIMITED",
      });
    },
  });
}
