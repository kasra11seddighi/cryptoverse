// Defines the portfolio and transaction routes. Authentication and rate limiting run before any of them.

import { Router } from "express";
import type { RequestHandler } from "express";

import { createUserRateLimiter, readLimitFromEnv } from "../../shared/middleware/user-rate-limit.middleware.js";
import { createPortfolioController } from "./portfolio.controller.js";
import type { PortfolioService } from "./portfolio.service.js";

export interface PortfolioRouterOptions {
  // Middleware that must pass before any route (the project's authentication middleware).
  guard: RequestHandler | RequestHandler[];
  service: PortfolioService;
}

const accountLimit = readLimitFromEnv("ACCOUNT_RATE_LIMIT_PER_MINUTE", 120);
const tradeLimit = readLimitFromEnv("TRADE_RATE_LIMIT_PER_MINUTE", 30);

// Routes under /api/v1/portfolio.
export function createPortfolioRouter(options: PortfolioRouterOptions): Router {
  const controller = createPortfolioController(options.service);
  const router = Router();

  router.use(options.guard);
  router.use(createUserRateLimiter({ limit: accountLimit }));

  router.get("/", controller.getPortfolio);
  router.post("/trades", createUserRateLimiter({ limit: tradeLimit, message: "Too many trades. Please slow down." }), controller.trade);
  router.post("/reset", controller.reset);

  return router;
}

// Routes under /api/v1/transactions.
export function createTransactionsRouter(options: PortfolioRouterOptions): Router {
  const controller = createPortfolioController(options.service);
  const router = Router();

  router.use(options.guard);
  router.use(createUserRateLimiter({ limit: accountLimit }));

  router.get("/", controller.listTransactions);

  return router;
}
