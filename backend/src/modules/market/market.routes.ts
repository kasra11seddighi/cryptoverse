// Defines the market data routes and applies authentication and rate limiting before any of them run.

import { Router } from "express";
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";

import { createMarketController } from "./market.controller.js";
import { MarketError } from "./market.errors.js";
import { createMarketRateLimiter } from "./market.rateLimit.js";
import { MarketService } from "./market.service.js";

export interface MarketRouterOptions {
  /** Middleware that must pass before any market route (the project's authentication middleware). Required so the routes can never be mounted unprotected by accident. */
  guard: RequestHandler | RequestHandler[];
  service?: MarketService;
}

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

// Forwards rejected promises from async handlers to the error-handling middleware.
const wrap =
  (handler: AsyncHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

/**
 * Turns MarketError into the { success: false, message, code } shape and adds Retry-After.
 * Anything else (for example an authentication error from `guard`) goes on to the application's
 * global error handler, so both handlers work together.
 */
const marketErrorHandler: ErrorRequestHandler = (error: unknown, _req: Request, res: Response, next: NextFunction): void => {
  if (!(error instanceof MarketError)) {
    next(error);
    return;
  }
  if (error.retryAfterSeconds !== null) res.setHeader("Retry-After", String(error.retryAfterSeconds));
  res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
};

export function createMarketRouter(options: MarketRouterOptions): Router {
  const controller = createMarketController(options.service ?? new MarketService());
  const router = Router();

  // Authentication first, so unauthenticated callers never reach the limiter, the cache or CoinGecko.
  router.use(options.guard);
  router.use(createMarketRateLimiter());

  router.get("/coins", wrap(controller.coins));
  router.get("/coins/:id/chart", wrap(controller.chart));
  router.get("/coins/:id", wrap(controller.coin));
  router.get("/global", wrap(controller.global));
  router.get("/search", wrap(controller.search));
  router.get("/trending", wrap(controller.trending));
  router.get("/prices", wrap(controller.prices));

  router.use(marketErrorHandler);
  return router;
}
