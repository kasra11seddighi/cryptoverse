// Defines market-specific errors that extend the project's AppError so the global error handler understands them.

import { AppError } from "../../shared/errors/AppError.js";

export type MarketErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_REJECTED"
  | "UPSTREAM_TIMEOUT"
  | "NOT_CONFIGURED";

/** Error with an HTTP status and a message that is safe to show to API clients. */
export class MarketError extends AppError {
  readonly code: MarketErrorCode;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, statusCode: number, code: MarketErrorCode, retryAfterSeconds: number | null = null) {
    super(message, statusCode);
    this.name = "MarketError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const validationError = (message: string): MarketError => new MarketError(message, 400, "VALIDATION_ERROR");
