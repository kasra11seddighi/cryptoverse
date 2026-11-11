// Handles application, validation, and unexpected errors globally.

import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  // Handle Zod validation errors.
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // Handle known application errors.
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  // Log unexpected errors for debugging.
  console.error(error);

  // Hide internal error details from API clients.
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
