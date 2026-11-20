# CryptoVerse Backend

Express 5 + TypeScript (NodeNext, ES modules) API for CryptoVerse: authentication with JWT access/refresh tokens, user accounts on MongoDB, and a CoinGecko-backed market data module.

## Requirements

- Node.js 20+ recommended (verified on 22; the market module needs 18+ for native `fetch`)
- A MongoDB database (local or Atlas)
- A free CoinGecko **Demo** API key for market data: <https://www.coingecko.com/en/api>

## Setup

```bash
cd backend
npm install            # or: npm ci
cp .env.example .env   # then fill in the values below
npm run dev            # development server with reload (tsx watch)
```

Production:

```bash
npm run build          # compiles to dist/
npm start              # node dist/server.js
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | no | `development` (default behaviour), `production`, `test` |
| `PORT` | no | HTTP port, default `5000` |
| `CLIENT_URL` | no | Allowed CORS origin, default `http://localhost:5173` |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_ACCESS_SECRET` | yes | Secret for access tokens (15 min lifetime) |
| `JWT_REFRESH_SECRET` | yes | Secret for refresh tokens (7 day lifetime); use a different value from the access secret |
| `REDIS_URL` | no | Present in the original configuration; not used by the code yet |
| `COINGECKO_API_KEY` | for market data | CoinGecko Demo key. Server-side only. Without it `/api/v1/market/*` answers `503` |

Optional market tuning variables (`COINGECKO_BASE_URL`, `COINGECKO_TIMEOUT_MS`, `COINGECKO_MAX_REQUESTS_PER_MINUTE`, `MARKET_LIST_SIZE`, `MARKET_RATE_LIMIT_PER_MINUTE`) are documented in [docs/market-api.md](docs/market-api.md) and listed, commented out, in `.env.example`.

`.env` is ignored by Git. **Never commit real secrets or the CoinGecko key**, and never expose the key to the frontend (no `VITE_` prefix).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start with `tsx watch` |
| `npm run build` | Type-check strictly and compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | Run all tests once (Vitest) |
| `npm run test:watch` | Vitest in watch mode |

Tests need no database, no network and no real API key: services are mocked and CoinGecko is simulated.

## API overview

Base path: `/api/v1`. Success responses use `{ "success": true, ... }`, errors `{ "success": false, "message": "..." }`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | no | Health check |
| POST | `/users/register` | no | Create an account |
| GET | `/users/me` | Bearer | Current user's profile |
| POST | `/auth/login` | no | Returns an access token; sets the HttpOnly `cryptoverse_refresh` cookie (path `/api/v1/auth`) |
| POST | `/auth/refresh` | cookie | Rotates the refresh token, returns a new access token |
| POST | `/auth/logout` | cookie | Revokes the refresh session |
| GET | `/market/coins` | Bearer | Paginated, sortable, searchable market list |
| GET | `/market/coins/:id` | Bearer | Coin detail |
| GET | `/market/coins/:id/chart` | Bearer | Price / market cap / volume history (`days=1\|7\|30\|90\|365\|max`) |
| GET | `/market/global` | Bearer | Global market statistics |
| GET | `/market/search` | Bearer | Coin search (`query`, `limit`) |
| GET | `/market/trending` | Bearer | Trending coins |
| GET | `/market/prices` | Bearer | Lightweight prices for a list of ids |

The full market reference (parameters, response shapes, error codes, caching, rate limits) is in [docs/market-api.md](docs/market-api.md).

## Project structure

```
src/
  app.ts                     Express app: security, CORS, parsers, limiter, routes, error handlers
  server.ts                  Connects MongoDB, starts the HTTP server
  config/db.ts
  middlewares/               error + not-found handlers
  shared/errors/AppError.ts
  modules/
    auth/ users/ health/     Existing modules (unchanged)
    market/                  CoinGecko market data module
      market.routes.ts       Router: auth guard -> rate limiter -> endpoints
      market.controller.ts   HTTP layer
      market.service.ts      Business logic and caching
      coingecko.client.ts    Only place that talks to CoinGecko
      market.cache.ts        In-memory TTL cache (coalescing, stale fallback)
      market.config.ts       Environment-based settings
      market.errors.ts       MarketError (extends AppError)
      market.mapper.ts       Provider payload -> API shapes
      market.rateLimit.ts    Per-user limiter (express-rate-limit)
      market.types.ts / market.validation.ts / index.ts
tests/
  auth.test.ts               Existing authentication tests
  market/                    Market unit and integration tests
docs/
  market-api.md              Market API reference
  INTEGRATION_REPORT.md      What changed when the market module was integrated
```

## Behaviour worth knowing

- **Market data is cached in memory per process** and is lost on restart. Running several instances means each has its own cache and its own rate-limit counters.
- **Rate limiting:** the general limiter (100 requests / 15 min / IP) applies to everything except `/api/v1/market/*`, which has its own per-user limiter (default 120 / min) plus outgoing request budgeting.
- **Behind a proxy** (Render, Nginx, Cloudflare...) set Express `trust proxy` so client IPs are correct for rate limiting.
