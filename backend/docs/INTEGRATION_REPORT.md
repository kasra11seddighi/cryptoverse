# Integration Report: CoinGecko market module → CryptoVerse backend

## Summary

Backend B (market data module) was integrated into Backend A (the authoritative backend) as a regular module under `src/modules/market`, mounted at `/api/v1/market` behind the existing `authenticate` middleware. There is one Express app, one error-handling chain and one set of dependencies. `package.json`, `package-lock.json` and `tsconfig.json` are byte-identical to the original: no dependency was added, changed or downgraded, and the module system is unchanged.

## Files

**Modified (2)**

| File | Change |
| --- | --- |
| `src/app.ts` | Three additive edits: import the market router and `authenticate`; `skip` option on the existing general limiter for `/api/v1/market*`; `app.use("/api/v1/market", createMarketRouter({ guard: authenticate }))`. No existing line was altered or removed. |
| `.env.example` | Appended `COINGECKO_API_KEY=` and the commented optional tuning variables. Existing entries untouched. |

**Added**

- `src/modules/market/` (12 files): `coingecko.client.ts`, `index.ts`, `market.cache.ts`, `market.config.ts`, `market.controller.ts`, `market.errors.ts`, `market.mapper.ts`, `market.rateLimit.ts`, `market.routes.ts`, `market.service.ts`, `market.types.ts`, `market.validation.ts`
- `tests/market/` (7 files): `fixtures.ts` (fake CoinGecko) plus `market.validation`, `market.mapper`, `market.cache`, `coingecko.client`, `market.service`, `market.routes`, `market.limits` test files
- `README.md`, `docs/market-api.md`, `docs/INTEGRATION_REPORT.md`

**Not shipped:** the original `.env` (local secrets), `dist/` (build output) and `node_modules/`. Backend B's `.env.market.example` was merged into `.env.example` instead of being kept as a separate file.

**Untouched:** every file in `src/modules/auth`, `src/modules/users`, `src/modules/health`, `src/config`, `src/middlewares`, `src/shared`, `src/server.ts`, and `tests/auth.test.ts`.

## Incompatibilities found and how they were resolved

| Problem in Backend B | Resolution |
| --- | --- |
| Relative imports had no `.js` extension, which fails at runtime under `module: NodeNext` (compiled output cannot be loaded by Node ESM) | Added `.js` to every relative import. Verified by running the compiled `dist/` under plain Node, not only under Vitest. |
| `MarketError` was a standalone class, unknown to the global error handler | Now extends `AppError`. Market routes still answer with `code` and `Retry-After`; if a `MarketError` ever escapes the router, the global handler formats it correctly (tested). |
| Hand-rolled in-memory per-IP rate limiter duplicating the project's `express-rate-limit` | Replaced with `express-rate-limit` (already a dependency), keyed per authenticated user with IP fallback via `ipKeyGenerator`; limit still read lazily from `MARKET_RATE_LIMIT_PER_MINUTE`. |
| The existing global limiter (100 req / 15 min / IP) would throttle any dashboard that polls prices | The global limiter now skips `/api/v1/market*`; the market module has its own per-user limiter. All other routes remain limited (tested: 110 market requests succeed, then exactly 100 health checks pass and the 101st is limited). |
| `guard` was optional in `createMarketRouter`, so the routes could be mounted unprotected by mistake | `guard` is now required by the type signature. |
| Backend B shipped with no tests | 139 new tests added (see below). |
| Docs described manual mounting, per-IP limiting and `.env.market.example` | `docs/market-api.md` rewritten for the integrated state. |

## Architectural decisions

- **All market endpoints require authentication.** No exception was made: no frontend requirement establishing public access was provided, and an open endpoint would let anyone spend the shared CoinGecko credit budget.
- **Router factory with dependency injection** (`createMarketRouter({ guard, service })`) keeps the module decoupled from `auth` and testable without a database.
- **Market validation stays hand-written** (small, dependency-free, already thorough) instead of being rewritten with Zod. Consequence: market `400` responses are `{ success, message, code }`, while Zod-validated existing endpoints return `{ success, message, errors[] }`.
- **Market error bodies carry an extra `code` field** (`RATE_LIMITED`, `UPSTREAM_ERROR`, …) that existing errors do not have. This is additive and does not change any existing contract.
- **Cache stays in memory.** `ioredis` and `REDIS_URL` exist in the original project but are not used anywhere; wiring Redis in would be new scope.

## Preserved functionality

Authentication and JWT access/refresh handling, registration, login, refresh rotation, logout, `/users/me`, MongoDB/Mongoose configuration, helmet, CORS, cookie handling, body-size limits, the global and not-found handlers, the health check, the general API limiter (for every non-market route), the environment configuration, and all 13 original tests (unmodified, all passing).

## Known limitations

1. **Never run against the live CoinGecko API.** No API key was available (and none was requested), and the sandbox cannot reach coingecko.com. All provider behaviour is verified against a simulated CoinGecko built from the documented response shapes. Please make one real call per endpoint with your key; in particular verify `price_change_percentage=1h,24h,7d,30d,1y`, `/coins/markets?ids=` and whether your plan accepts `days=max` (the code falls back to 365 days if it does not).
2. **Never run against a real MongoDB.** Existing and new tests mock the user/auth services (as the original tests do); `npm start` was not exercised because it requires a database. The compiled app was smoke-tested over real HTTP without a database connection.
3. **Cache and rate-limit counters are per process.** Multiple instances each keep their own.
4. **Unauthenticated requests to `/api/v1/market*` are no longer counted by the general IP limiter.** They receive `401` before reaching any cache or provider call, so they cost nothing upstream, but they are not IP-throttled.
5. **Behind a reverse proxy, `trust proxy` must be configured** for correct client IPs (not changed here: deployment-specific).
6. The uploaded archive contained a `.env`. It was not read beyond variable names, not used, and not copied. If it holds real credentials, treat them as shared and rotate them.

## Verification (actual results)

Environment: Node.js v22.23.4, npm 10.9.9, Vitest 5.1.0, TypeScript 7.x (from the lockfile).

| Check | Result |
| --- | --- |
| Baseline before changes: `npm test` | 1 file, **13/13 passed** |
| Baseline before changes: `npm run build` | exit 0 |
| `npm ci` on the final tree | 203 packages, 0 vulnerabilities |
| `npm test` on the final tree | **8 files, 152/152 passed** (13 original + 139 new) |
| `npm run build` on the final tree | **exit 0**, no errors (strict, `noUnusedLocals`, `noUnusedParameters`) |
| Typecheck of `src/` + `tests/market/` together | exit 0 |
| Repeat full test runs (3 extra) | 152/152 each time, no flakiness |
| Compiled `dist/` under plain Node ESM, real HTTP, fake provider | health 200; market without token 401; with token 200; invalid param 400; provider received the key only as the `x-cg-demo-api-key` header, never in a URL or response |
| Mutation check (deliberately broke the code, then restored it) | removing the auth guard → 11 tests failed; API key in URL → 2 failed; removing the limiter skip → 1 failed; uncapped `Retry-After` → 1 failed; restored → 152/152 |

New tests by file: validation 36, mapper 17, client 14, cache 7, service 18, routes (real app, real JWT auth, real error handler) 43, limits 4.

What the route/integration tests cover: all 7 endpoints return 401 without a token (and CoinGecko is never called); malformed token and refresh-token-as-access-token are rejected; all 7 endpoints return the standard envelope; 18 invalid-input cases return `400 VALIDATION_ERROR` without calling the provider; provider 429 → `429` + `Retry-After` and pause with no further upstream calls; provider 500/401 → generic `502` with no leaked detail; unknown coin → `404`; timeout → `504`; missing key → `503` with no outbound call; unexpected errors → generic `500` via the global handler; stale-cache fallback over HTTP (`meta.stale: true`) and expiry of the stale window; the API key never appears in URLs, responses or logs; per-user limiter and the global-limiter skip; and regression checks for `/health`, `/users/me`, register and login.
