// Defines a custom application error with an HTTP status code.

export class AppError extends Error {
  // Stores the HTTP status code associated with this error.
  public readonly statusCode: number;

  // Indicates whether the error is an expected application error.
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;

    // Preserves the correct stack trace for debugging.
    Error.captureStackTrace(this, this.constructor);
  }
}
