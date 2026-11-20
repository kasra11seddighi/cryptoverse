export const PATHS = {
  overview: "/",
  markets: "/markets",
  coin: (coinId: string) => `/markets/${coinId}`,
  watchlist: "/watchlist",
  portfolio: "/portfolio",
  /** Portfolio with the trade panel preselected (read from the query string). */
  portfolioTrade: (coinId: string, side: "buy" | "sell" = "buy") =>
    `/portfolio?coin=${encodeURIComponent(coinId)}&side=${side}`,
  transactions: "/transactions",
  analytics: "/analytics",
  settings: "/settings",
  login: "/login",
  register: "/register",
} as const;
