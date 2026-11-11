// Verifies access tokens and protects authenticated API routes.

import type { Request, Response, NextFunction } from "express";

import { verifyAccessToken } from "./jwt.service.js";
import { AppError } from "../../shared/errors/AppError.js";

// Extends Express Request with authenticated user information.
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: "user" | "admin";
      };
    }
  }
}

// Checks the Authorization header and authenticates the request.
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    // Read the bearer token from the Authorization header.
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new AppError("Authentication required", 401);
    }

    // Extract and verify the access token.
    const token = authorization.split(" ")[1];

    if (!token) {
      throw new AppError("Invalid authorization header", 401);
    }

    const payload = verifyAccessToken(token);

    // Attach authenticated user information to the request.
    req.user = payload;

    next();
  } catch (error) {
    // Forward known authentication errors or normalize JWT errors.
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError("Invalid or expired access token", 401));
  }
}
