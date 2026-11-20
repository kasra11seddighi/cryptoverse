# Market data API (CoinGecko)

Live market data for CryptoVerse. The backend is the only component that talks to CoinGecko; the browser calls these endpoints and never sees the API key.

All endpoints live under `/api/v1/market` and **require authentication**: send the access token from `POST /api/v1/auth/login` as `Authorization: Bearer <accessToken>`. This protects the CoinGecko credit budget, which is shared by every user. There are no public market endpoints.

## Setup

1. Create a free account at <https://www.coingecko.com/en/api> and generate a **Demo** API key in the developer dashboard.
2. Add it to `backend/.env` (never to `.env.example`, never to Git, never with a `VITE_` prefix):
   ```
   COINGECKO_API_KEY=your-demo-key
   ```
   If the key is missing, market endpoints answer `503` (`"Market data is not configured on the server."`) and nothing is sent to CoinGecko.
3. Restart the server. The router is already mounted in `src/app.ts`:
   ```ts
   app.use("/api/v1/market", createMarketRouter({ guard: authenticate }));
   ```
   The `guard` option is required, so the router cannot be mounted without authentication by accident.

Requires Node.js 18+ (global `fetch`). Behind a reverse proxy, enable Express `trust proxy` so rate limiting sees client addresses.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `COINGECKO_API_KEY` | _(none)_ | Demo API key, sent only as the `x-cg-demo-api-key` header. **Required.** |
| `COINGECKO_BASE_URL` | `https://api.coingecko.com/api/v3` | Leave unset in production. Intended for tests and local fakes: the API key is sent to whatever host this points at. |
| `COINGECKO_TIMEOUT_MS` | `8000` | Per-request timeout (1000–30000). |
| `COINGECKO_MAX_REQUESTS_PER_MINUTE` | `25` | Ceiling on outgoing CoinGecko requests per rolling minute (1–500). |
| `MARKET_LIST_SIZE` | `250` | Size of the cached "top coins" list (10–250). |
| `MARKET_RATE_LIMIT_PER_MINUTE` | `120` | Requests per user per minute to the market endpoints (10–10000). |

Out-of-range values are clamped; non-numeric values fall back to the default.

## Response format

Success: `{ "success": true, "message": "OK", "data": ..., "meta": { "fetchedAt": "ISO-8601", "stale": false } }`

Error: `{ "success": false, "message": "...", "code": "RATE_LIMITED" }`, plus a `Retry-After` header for `429`. Authentication errors (`401`), unknown routes (`404`) and unexpected failures (`500`) use the backend's global shape `{ "success": false, "message": "..." }` without `code`.

`meta.stale: true` means CoinGecko could not be reached and an older cached copy (at most 30 minutes old) is being served; `fetchedAt` says when it was originally fetched. All money values are USD. `null` means "not available", never zero. Coin identifiers are CoinGecko ids (`bitcoin`), not symbols.

### Error codes

| HTTP | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid or oversized query/path parameter |
| 401 | _(none)_ | Missing, invalid or expired access token |
| 404 | `NOT_FOUND` | CoinGecko does not know the coin |
| 429 | `RATE_LIMITED` | Per-user limit exceeded, or CoinGecko is rate limiting the server. Honour `Retry-After` |
| 502 | `UPSTREAM_ERROR` / `UPSTREAM_REJECTED` | CoinGecko failed, returned garbage, or rejected the request (e.g. plan restriction) |
| 503 | `NOT_CONFIGURED` | `COINGECKO_API_KEY` is not set |
| 504 | `UPSTREAM_TIMEOUT` | CoinGecko did not answer within the timeout |

Messages never contain provider details, keys, or stack traces.

## Endpoints

| Method | Path | Query | `data` |
| --- | --- | --- | --- |
| GET | `/api/v1/market/coins` | `page` (1+), `pageSize` (1-250, default 20), `search` (max 64 chars), `sortBy` (`rank` `name` `price` `change24h` `marketCap` `volume24h` `circulatingSupply`), `sortDirection` (`asc` `desc`), `ids` (comma list, max 100; returns exactly those coins in that order and ignores paging) | `{ items: Coin[], total, page, pageSize, totalPages }` |
| GET | `/api/v1/market/coins/:id` | | `Coin` + `description` (plain text), `categories[]` |
| GET | `/api/v1/market/coins/:id/chart` | `days`: `1` `7` `30` `90` `365` `max` (default 7) | `{ id, days, effectiveDays, truncated, prices[], marketCaps[], totalVolumes[] }`, points are `{ timestamp (ms), value }`, at most 500 per series |
| GET | `/api/v1/market/global` | | `{ totalMarketCap, totalVolume24h, btcDominance, ethDominance, marketCapChange24h, activeCryptocurrencies, markets, breadth }` |
| GET | `/api/v1/market/search` | `query` (required, max 64), `limit` (1-10, default 6) | `{ id, name, symbol, rank, imageUrl, price, change24h }[]` (price fields filled when the coin is in the cached top list) |
| GET | `/api/v1/market/trending` | `limit` (1-15, default 10) | `{ id, name, symbol, rank, score, imageUrl }[]` |
| GET | `/api/v1/market/prices` | `ids` (required, comma list, max 100) | `{ [id]: { usd, usd24hChange } }` |

`Coin`: `id, symbol, name, imageUrl, rank, price, marketCap, fullyDilutedValuation, volume24h, high24h, low24h, priceChange{1H,24H,7D,30D,1Y}, circulatingSupply, totalSupply, maxSupply, ath, athChangePercent, atl, atlChangePercent`.

Query parameters must be single values (`?page=1&page=2` is rejected). Coin ids are lower-cased and must match `[a-z0-9][a-z0-9._-]{0,99}`.

### Example

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:5000/api/v1/market/coins?pageSize=10&sortBy=marketCap&sortDirection=desc"
```

## How requests map to CoinGecko

- **List, search enrichment, breadth:** one cached call to `/coins/markets` for the top `MARKET_LIST_SIZE` (default 250) coins by market cap, `sparkline=false`, `price_change_percentage=1h,24h,7d,30d,1y`. Search, sorting and paging by any column are then done in memory, because CoinGecko cannot sort by price or 24h change. The list therefore covers the top 250 coins. Coins outside it are still available by id (`ids=`) through one extra `/coins/markets?ids=` call.
- **Detail:** `/coins/{id}` with `localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`.
- **Chart:** `/coins/{id}/market_chart?vs_currency=usd&days=...`. If the plan refuses `max`, a single fallback request for 365 days is made and the response has `truncated: true`.
- **Global:** `/global`. **Search:** `/search`. **Trending:** `/search/trending`. **Prices:** `/simple/price`.

## Caching

In-memory, per server process (emptied on restart; sharing between several instances would need Redis, which is not wired up yet).

| Data | Fresh for |
| --- | --- |
| Market list (and ids lookups) | 60 s |
| Global statistics | 60 s |
| Trending | 5 min |
| Coin detail | 2 min |
| Historical charts | 5 min |
| Search | 30 s |
| Simple prices | 30 s |

Identical concurrent requests share one CoinGecko call. If CoinGecko fails (rate limit, timeout, error) and a cached copy up to 30 minutes old exists, it is returned with `meta.stale: true`; otherwise the error is returned. Entry counts are capped, so memory cannot grow without bound.

## Rate limiting

Three independent layers protect the CoinGecko budget:

1. **Per user (inbound):** each authenticated user may call the market endpoints `MARKET_RATE_LIMIT_PER_MINUTE` times per minute (default 120). Exceeding it returns `429` with `Retry-After`. Counters are per server process.
2. **Per server (outbound):** at most `COINGECKO_MAX_REQUESTS_PER_MINUTE` (default 25) requests per rolling minute are sent to CoinGecko; beyond that clients get `429` (or stale cached data).
3. **Provider pushback:** on HTTP 429 from CoinGecko the server honours `Retry-After` (default 60 s, capped at 1 hour): no request is sent to CoinGecko during that pause, nothing is retried, and clients get `429` with `Retry-After` (or stale cached data when available).

The backend's general API limiter (100 requests / 15 minutes per IP) deliberately **skips** `/api/v1/market/*`, because a dashboard that refreshes prices would exhaust it within minutes. All other routes remain covered by it. Unauthenticated requests to market routes receive `401` before touching the cache or CoinGecko.

## Security notes

- The API key is read from the environment, sent only in the `x-cg-demo-api-key` header, and never logged, put in a URL, or returned in a response.
- Provider responses are treated as untrusted: every field is type-checked, HTML in descriptions is stripped, and unusable entries are dropped.
- Provider error bodies are never forwarded to clients.

## Notes and limits

- Demo-plan limits (monthly credits, per-minute rate, history range) are CoinGecko's and may change; check your dashboard.
- The automated tests use a simulated CoinGecko. `price_change_percentage=1h,24h,7d,30d,1y` and `/coins/markets?ids=` come from CoinGecko's documentation rather than from calls made with a real key; verify them once against the live API with your key.
