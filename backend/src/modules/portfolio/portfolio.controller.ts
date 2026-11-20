// Validates portfolio requests, calls the portfolio service, and sends standardized responses.
// Express 5 forwards errors thrown or rejected inside async handlers to the global error handler.

import type { Request, Response } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import type { PortfolioService } from "./portfolio.service.js";
import { tradeSchema, transactionsQuerySchema } from "./portfolio.validation.js";

// The authentication middleware always runs first; this keeps the type checker and a misconfigured route honest.
function currentUserId(req: Request): string {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user.userId;
}

export function createPortfolioController(service: PortfolioService) {
  return {
    async getPortfolio(req: Request, res: Response): Promise<void> {
      const data = await service.getPortfolio(currentUserId(req));
      res.status(200).json({ success: true, message: "OK", data });
    },

    async trade(req: Request, res: Response): Promise<void> {
      const input = tradeSchema.parse(req.body);
      const data = await service.trade(currentUserId(req), input);
      res.status(201).json({ success: true, message: "Simulated trade completed", data });
    },

    async reset(req: Request, res: Response): Promise<void> {
      const data = await service.reset(currentUserId(req));
      res.status(200).json({ success: true, message: "Portfolio reset", data });
    },

    async listTransactions(req: Request, res: Response): Promise<void> {
      const query = transactionsQuerySchema.parse(req.query);
      const data = await service.listTransactions(currentUserId(req), query);
      res.status(200).json({ success: true, message: "OK", data });
    },
  };
}
