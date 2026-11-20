import type { MarketService, PortfolioHistoryService, PortfolioService, WatchlistService } from "./contracts";
import { createPortfolioHistoryService } from "./api/portfolioHistory.service";
import { apiMarketService } from "./api/market.service";
import { apiPortfolioService } from "./api/portfolio.service";
import { apiWatchlistService } from "./api/watchlist.service";

export { authService } from "./api/auth.service";

/** Market data comes from the backend market API (CoinGecko behind a cache). */
export const marketService: MarketService = apiMarketService;

/** Portfolio history = simulated transactions replayed against real historical prices. */
export const portfolioHistoryService: PortfolioHistoryService = createPortfolioHistoryService(marketService);

/** The simulated account (balance, holdings, transactions) is stored in MongoDB behind the backend. */
export const portfolioService: PortfolioService = apiPortfolioService;

/** The watchlist is stored in MongoDB behind the backend. */
export const watchlistService: WatchlistService = apiWatchlistService;
