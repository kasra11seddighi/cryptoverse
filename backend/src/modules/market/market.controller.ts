// Validates market requests, calls the market service, and sends standardized responses.

import type { Request, Response } from "express";
import type { MarketService } from "./market.service.js";
import {
  parseChartDays,
  parseCoinId,
  parseCoinsQuery,
  parsePricesQuery,
  parseSearchQuery,
  parseTrendingLimit,
} from "./market.validation.js";
import type { ResponseMeta } from "./market.types.js";

function sendOk<T>(res: Response, data: T, meta: ResponseMeta): void {
  res.status(200).json({ success: true, message: "OK", data, meta });
}

/** Thin HTTP layer: parse and validate input, call the service, wrap the result. */
export function createMarketController(service: MarketService) {
  return {
    async coins(req: Request, res: Response): Promise<void> {
      const result = await service.getCoins(parseCoinsQuery(req.query));
      sendOk(res, result.data, result.meta);
    },

    async coin(req: Request, res: Response): Promise<void> {
      const result = await service.getCoinDetail(parseCoinId(req.params.id));
      sendOk(res, result.data, result.meta);
    },

    async chart(req: Request, res: Response): Promise<void> {
      const result = await service.getChart(parseCoinId(req.params.id), parseChartDays(req.query.days));
      sendOk(res, result.data, result.meta);
    },

    async global(_req: Request, res: Response): Promise<void> {
      const result = await service.getGlobal();
      sendOk(res, result.data, result.meta);
    },

    async search(req: Request, res: Response): Promise<void> {
      const { query, limit } = parseSearchQuery(req.query);
      const result = await service.search(query, limit);
      sendOk(res, result.data, result.meta);
    },

    async trending(req: Request, res: Response): Promise<void> {
      const result = await service.getTrending(parseTrendingLimit(req.query));
      sendOk(res, result.data, result.meta);
    },

    async prices(req: Request, res: Response): Promise<void> {
      const result = await service.getPrices(parsePricesQuery(req.query));
      sendOk(res, result.data, result.meta);
    },
  };
}
