// Defines the watchlist routes. Authentication and rate limiting run before any of them.

import { Router } from "express";
import type { RequestHandler } from "express";

import { createUserRateLimiter, readLimitFromEnv } from "../../shared/middleware/user-rate-limit.middleware.js";
import { createWatchlistController } from "./watchlist.controller.js";
import type { WatchlistService } from "./watchlist.service.js";

export interface WatchlistRouterOptions {
  // Middleware that must pass before any route (the project's authentication middleware).
  guard: RequestHandler | RequestHandler[];
  service: WatchlistService;
}

const accountLimit = readLimitFromEnv("ACCOUNT_RATE_LIMIT_PER_MINUTE", 120);

// Routes under /api/v1/watchlist.
export function createWatchlistRouter(options: WatchlistRouterOptions): Router {
  const controller = createWatchlistController(options.service);
  const router = Router();

  router.use(options.guard);
  router.use(createUserRateLimiter({ limit: accountLimit }));

  router.get("/", controller.get);
  router.delete("/coins", controller.clear);
  router.put("/coins/:coinId", controller.addCoin);
  router.delete("/coins/:coinId", controller.removeCoin);
  router.patch("/sort", controller.setSort);

  return router;
}
