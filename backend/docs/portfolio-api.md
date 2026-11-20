# Portfolio, Transactions and Watchlist API

All endpoints are under `/api/v1`, require `Authorization: Bearer <accessToken>`, and answer with
`{ success, message, data }`. Errors answer `{ success: false, message }` (validation errors also carry `errors`).
Everything is simulated: no real money, orders or payments exist.

## How the account works

- The account is **never stored as a balance**. Each user has one `Portfolio` document (only the starting
  balance, 100,000 USD) and a list of `Transaction` documents. Cash and holdings are replayed from the completed
  transactions (`portfolio.ledger.ts`), so they cannot drift apart from the history.
- A trade is a single insert. Every transaction has a per-user `seq`, and `{ userId, seq }` is a unique index.
  Two simultaneous trades therefore cannot both be based on the same balance: the loser is re-validated against
  the new state (up to 3 attempts, then `409`). No multi-document MongoDB transaction (and no replica set) is needed.
- **The server sets the price.** `POST /portfolio/trades` takes `coinId`, `side` and `quantity` only. The price,
  symbol and name come from the market service; a `price` sent by a client is ignored. Trades are refused with
  `503` when only a stale cached price is available.
- Limit: 5,000 transactions per user (the client values the account by replaying them). `POST /portfolio/reset` clears them.

## Portfolio

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/portfolio` | `{ startingBalance, cashBalance, holdings[], transactions[] }`; `transactions` are the completed ones, newest first. Creates the account on first use. |
| POST | `/portfolio/trades` | Body `{ coinId, side: "buy" \| "sell", quantity }`. `quantity` > 0, at most 8 decimals. `201` with `{ portfolio, transaction }`. `422` when the rules refuse it (balance, holding, order below 0.01 USD), `404` unknown coin, `503` no fresh price, `409` limit reached or lost race. |
| POST | `/portfolio/reset` | Deletes all transactions, restores the starting balance, returns the portfolio. |

## Transactions

`GET /transactions` — server-side filtering, sorting and paging.

| Query | Values | Default |
| --- | --- | --- |
| `page` | 1–100000 | 1 (a page past the end returns the last page) |
| `pageSize` | 1–100 | 10 |
| `search` | up to 64 chars, matched against name and symbol, case-insensitive, literal | empty |
| `side` | `all`, `buy`, `sell` | `all` |
| `status` | `all`, `completed`, `pending`, `failed` | `all` |
| `sortBy` | `date`, `coin`, `quantity`, `price`, `total` | `date` |
| `sortDirection` | `asc`, `desc` | `desc` |

Returns `{ items, total, page, pageSize, totalPages, totals }`. `totals` (`completedCount`, `bought`, `sold`,
`realizedPnl`) always covers all completed transactions of the user, not just the filtered page.

## Watchlist

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/watchlist` | `{ coinIds[], sort: { key, direction } }`. A new user starts with bitcoin, ethereum, solana, chainlink. |
| PUT | `/watchlist/coins/:coinId` | Idempotent add (appended at the end). `409` beyond 100 coins. |
| DELETE | `/watchlist/coins/:coinId` | Remove. |
| DELETE | `/watchlist/coins` | Clear. An emptied list stays empty. |
| PATCH | `/watchlist/sort` | Body `{ key, direction }`; keys as in the market list (`rank`, `name`, `price`, `change24h`, `marketCap`, `volume24h`, `circulatingSupply`). |

Every watchlist call returns the updated watchlist.

## Rate limits

These routes are not counted by the general 100 requests / 15 min IP limiter. Each has a per-user limiter instead:
`ACCOUNT_RATE_LIMIT_PER_MINUTE` (default 120) and, for `POST /portfolio/trades`, `TRADE_RATE_LIMIT_PER_MINUTE` (default 30).

## Tests

`npm test` runs everything that needs no database. To also run the MongoDB integration tests
(`tests/portfolio/*.mongo.test.ts`, which use a throw-away database and drop it afterwards):

```
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test
```
