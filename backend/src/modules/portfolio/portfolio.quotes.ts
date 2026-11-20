// Supplies the execution price of simulated trades from the server-side market service.
// The client never sends a price, so it cannot choose its own.

import { AppError } from "../../shared/errors/AppError.js";
import type { MarketService } from "../market/index.js";

export interface Quote {
  coinId: string;
  symbol: string;
  name: string;
  price: number;
}

export interface QuoteProvider {
  getQuote(coinId: string): Promise<Quote>;
}

export function createMarketQuoteProvider(market: Pick<MarketService, "getCoins">): QuoteProvider {
  return {
    async getQuote(coinId) {
      const served = await market.getCoins({
        page: 1,
        pageSize: 1,
        search: "",
        sortBy: "rank",
        sortDirection: "asc",
        ids: [coinId],
      });

      const coin = served.data.items.find((item) => item.id === coinId);
      if (!coin) throw new AppError("This coin is not available for trading.", 404);

      // A copy served because CoinGecko is unreachable can be many minutes old; trades never use it.
      if (served.meta.stale) throw new AppError("A live price is unavailable right now. Please try again shortly.", 503);

      if (!Number.isFinite(coin.price) || coin.price <= 0) {
        throw new AppError("The price for this asset is unavailable.", 503);
      }
      return { coinId: coin.id, symbol: coin.symbol, name: coin.name, price: coin.price };
    },
  };
}
