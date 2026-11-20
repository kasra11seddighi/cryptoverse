// Configures the Express application, security middleware, API routes, and error handling.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import healthRoutes from "./modules/health/health.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import { MarketService, createMarketRouter } from "./modules/market/index.js";
import {
  MongoPortfolioRepository,
  PortfolioService,
  createMarketQuoteProvider,
  createPortfolioRouter,
  createTransactionsRouter,
} from "./modules/portfolio/index.js";
import { MongoWatchlistRepository, WatchlistService, createWatchlistRouter } from "./modules/watchlist/index.js";
import { authenticate } from "./modules/auth/auth.middleware.js";

import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

// Creates the Express application instance.
const app = express();

// Defines the allowed frontend origin.
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Applies standard HTTP security headers.
app.use(helmet());

// Configures cross-origin requests and credential support.
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Parses incoming JSON requests with a size limit.
app.use(express.json({ limit: "10kb" }));

// Parses URL-encoded request bodies.
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Parses cookies before authentication routes are executed.
app.use(cookieParser());

// Logs HTTP requests in development mode.
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Areas that have their own per-user rate limiter and are therefore skipped by the general IP limiter.
const SELF_LIMITED_PREFIXES = [
  "/api/v1/market",
  "/api/v1/portfolio",
  "/api/v1/transactions",
  "/api/v1/watchlist",
];

// Limits the number of API requests from each IP address.
// Market, portfolio, transaction and watchlist endpoints are skipped here because they have their own per-user limiters.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => SELF_LIMITED_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix)),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Applies the general API rate limiter.
app.use("/api", apiLimiter);

// Registers the health check endpoints.
app.use("/api/v1", healthRoutes);

// Registers user-related endpoints.
app.use("/api/v1/users", userRoutes);

// Registers authentication endpoints.
app.use("/api/v1/auth", authRoutes);

// One market service is shared so the CoinGecko cache and request budget are used once, not per module.
const marketService = new MarketService();

// Registers CoinGecko market data endpoints. All of them require authentication.
app.use("/api/v1/market", createMarketRouter({ guard: authenticate, service: marketService }));

// Registers the simulated portfolio and transaction endpoints. Trades are priced by the market service.
const portfolioService = new PortfolioService(new MongoPortfolioRepository(), createMarketQuoteProvider(marketService));
app.use("/api/v1/portfolio", createPortfolioRouter({ guard: authenticate, service: portfolioService }));
app.use("/api/v1/transactions", createTransactionsRouter({ guard: authenticate, service: portfolioService }));

// Registers the watchlist endpoints.
app.use("/api/v1/watchlist", createWatchlistRouter({ guard: authenticate, service: new WatchlistService(new MongoWatchlistRepository()) }));

// Handles requests to undefined API routes.
app.use(notFoundHandler);

// Handles application errors.
app.use(errorHandler);

export default app;
