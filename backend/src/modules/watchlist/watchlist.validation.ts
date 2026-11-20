// Defines Zod validation schemas for watchlist requests.

import { z } from "zod";

import { coinIdSchema } from "../portfolio/portfolio.validation.js";
import { WATCHLIST_SORT_KEYS } from "./watchlist.types.js";

export const coinParamsSchema = z.object({ coinId: coinIdSchema });

export const sortBodySchema = z.object({
  key: z.enum(WATCHLIST_SORT_KEYS),
  direction: z.enum(["asc", "desc"]),
});
