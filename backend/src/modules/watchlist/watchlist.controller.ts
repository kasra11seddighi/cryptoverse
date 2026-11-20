// Validates watchlist requests, calls the watchlist service, and sends standardized responses.
// Express 5 forwards errors thrown or rejected inside async handlers to the global error handler.

import type { Request, Response } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import type { WatchlistService } from "./watchlist.service.js";
import { coinParamsSchema, sortBodySchema } from "./watchlist.validation.js";

function currentUserId(req: Request): string {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user.userId;
}

export function createWatchlistController(service: WatchlistService) {
  return {
    async get(req: Request, res: Response): Promise<void> {
      const data = await service.getWatchlist(currentUserId(req));
      res.status(200).json({ success: true, message: "OK", data });
    },

    async addCoin(req: Request, res: Response): Promise<void> {
      const { coinId } = coinParamsSchema.parse(req.params);
      const data = await service.addCoin(currentUserId(req), coinId);
      res.status(200).json({ success: true, message: "Coin added to the watchlist", data });
    },

    async removeCoin(req: Request, res: Response): Promise<void> {
      const { coinId } = coinParamsSchema.parse(req.params);
      const data = await service.removeCoin(currentUserId(req), coinId);
      res.status(200).json({ success: true, message: "Coin removed from the watchlist", data });
    },

    async clear(req: Request, res: Response): Promise<void> {
      const data = await service.clear(currentUserId(req));
      res.status(200).json({ success: true, message: "Watchlist cleared", data });
    },

    async setSort(req: Request, res: Response): Promise<void> {
      const sort = sortBodySchema.parse(req.body);
      const data = await service.setSort(currentUserId(req), sort);
      res.status(200).json({ success: true, message: "Sort order saved", data });
    },
  };
}
