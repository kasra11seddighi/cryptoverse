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

// Limits the number of API requests from each IP address.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
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

// Handles requests to undefined API routes.
app.use(notFoundHandler);

// Handles application errors.
app.use(errorHandler);

export default app;
