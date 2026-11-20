# CryptoVerse — Frontend

Cryptocurrency market analytics with a **simulated** investment portfolio. Market data is live (CoinGecko, through the CryptoVerse backend); balances, holdings and trades are virtual. It does not execute real trades or hold real funds.

Stack: React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Router, Zustand, TanStack Query, Axios, Recharts, Lucide.

## Run locally

```bash
npm install
cp .env.example .env      # set VITE_DEV_PROXY_TARGET to your Express backend
npm run dev
npm run build             # tsc -b && vite build
npm run lint
```

In development the Vite dev server proxies `/api` to the backend, so requests are same-origin and the HttpOnly refresh cookie works without CORS changes. The backend must have the market module mounted and `COINGECKO_API_KEY` set (see `backend/docs/market-api.md`). **The frontend never contains or needs a CoinGecko key and never calls CoinGecko's API.**

## Status

| Phase | Scope |
| --- | --- |
| 1 | Types, service layer, Axios client, Zustand stores, providers, router |
| 2 | Login, register, session restoration, route guards |
| 3 | Application shell, global search, email validation with typo suggestions |
| 4 | Chart system, market table, stat cards, Dashboard and Markets |
| 5 | Coin details, Watchlist, Portfolio (simulated trading), Transactions, Analytics, Settings |
| 6 | Live market data from CoinGecko through the backend market API |

## Architecture

```
src/
  app/            providers (React Query, theme, auth bootstrap) and router
  components/     ui (Card, StatCard, Pagination, ...), charts (TimeSeriesChart, AllocationChart, SignedBarChart), layout (shell)
  features/       auth, dashboard, market, coins, portfolio, watchlist, transactions, analytics, settings
                  (components, hooks, pages per feature; pure business logic in plain .ts files next to them)
  hooks/          useCurrency, useDebouncedValue, useDismissable
  lib/            env, query client/keys, currency, ApiError
  services/
    contracts.ts  interfaces the UI depends on (MarketService, PortfolioHistoryService)
    api/          backend clients: Axios + token refresh, auth, market (+ DTO types and mapper), portfolio history
    mock/         portfolioSeed.ts only: the starting state of the simulated account
    index.ts      the single place that wires an implementation to each contract
  stores/         Zustand: auth (memory only), preferences, watchlist, portfolio, market feed status (memory only)
  types/, utils/
```

### Data sources

- **Auth:** `/auth/*` and `/users/*` of the backend. The access token lives in memory only; the refresh token stays in an HttpOnly cookie. Concurrent refreshes share one request.
- **Market data:** `GET /api/v1/market/*` (list, details, chart, global, search, trending). `services/api/market.service.ts` implements `MarketService`; `market.mapper.ts` is the only code that knows the response shapes. Coins are identified by their CoinGecko id (`bitcoin`), never by symbol.
- **Missing values:** the API returns `null` for values CoinGecko does not provide. They are shown as "—" (formatters and `PercentChange` handle `null`), sort last, and are never turned into 0.
- **Feed status:** each market response updates `marketStatus.store`; the header shows Live, Delayed (the backend served cached data because CoinGecko failed) or Unavailable. Errors render each component's error state with a Retry button; nothing is fabricated when the API fails. Rate limits (429) are not retried automatically.
- **Simulated account:** holdings, cash and transactions live in the portfolio store (localStorage) and change only through `features/portfolio/ledger.ts`. Live prices are used to *value* positions; they never rewrite recorded purchase prices or transactions. The seed (`services/mock/portfolioSeed.ts`) uses fixed demo purchase prices, so a fresh account's profit/loss reflects the difference to today's live prices.
- **Portfolio history:** `services/api/portfolioHistory.service.ts` replays the simulated transactions against real historical prices (one chart request per coin held, cached by the backend). Hourly or daily data, so the curve is an estimate; the last point can differ slightly from the summary cards, which use the market list.

### Pure logic

`positions.ts`, `summary.ts`, `valuation.ts`, `transactions/query.ts`, `analytics/performers.ts`, `coins/stats.ts`, `utils/coins.ts`, `services/api/portfolioHistory.service.ts` (`priceAt`) are plain TypeScript with no React or network access.

## Manual verification checklist

1. Log in, open every sidebar link; each page loads without errors and the header indicator shows "Live · CoinGecko".
2. Markets: numbers look like current market values; search, sort by clicking headers (including 24h change), paginate, star a coin. At phone width the table becomes cards.
3. Open a coin (`/markets/bitcoin`, and an unknown id such as `/markets/nope`): chart intervals 24H to Max, 24h high/low, statistics, About text, Trending card, watchlist toggle.
4. Header search: type a coin name; results show logo, price and 24h change.
5. Watchlist: add and remove coins, search, sort; reload and check the order persists.
6. Portfolio: buy and sell (also try invalid quantities). Cash, holdings, Transactions and Analytics update. Recorded purchase prices in Transactions never change when the market moves.
7. Stop the backend or remove `COINGECKO_API_KEY`: pages show error states with Retry and the indicator turns "Unavailable"; no placeholder numbers appear.
8. Settings: change currency (applies everywhere), notifications, reset the simulated portfolio.
9. Only the content area scrolls, never the browser page itself.

## Documentation

- `docs/email-validation.md`: frontend email rules and what the backend must enforce.
- Backend market API (endpoints, caching, rate limits, setup): `backend/docs/market-api.md`.

## Known limitations

- `npm run build` and `npm run lint` were not run in the environment that produced this code (no network or `node_modules`); run them locally.
- The refresh and `/users/me` response shapes are assumed to use the same `{ success, message, data }` envelope as login (see `auth.mapper.ts`).
- Lists cover the top 250 coins by market cap (backend `MARKET_LIST_SIZE`); other coins are reachable by id (details page, watchlist, portfolio) and through search.
- The CoinGecko Demo plan limits credits and history range; the chart "Max" range may be limited by it (the backend falls back to 365 days).
- Display currencies other than USD use fixed approximate rates, not live exchange rates.
- Logos are loaded from CoinGecko's image CDN (not its API); they fall back to a generated badge if unavailable.
- No light theme yet; number and date formats are fixed (en-US).
- Notifications and profile editing have no backend support; the UI says so.

## Where portfolio, transactions and watchlist live

They are stored on the server (MongoDB) per user and loaded through the API (`/portfolio`, `/transactions`,
`/watchlist`); nothing about them is kept in the browser any more. Orders are priced and validated by the backend.
The old `cryptoverse:portfolio` and `cryptoverse:watchlist` browser entries are deleted on start and are not imported.
Display preferences and notification choices are still stored in the browser.
