// Handles login, refresh token rotation, and logout HTTP requests.

import type { Request, Response, NextFunction } from "express";

import { loginUser } from "../users/user.service.js";
import { loginUserSchema } from "../users/user.validation.js";

import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "./auth.cookie.js";

import { refreshSession, revokeSession } from "./auth.service.js";

// Authenticates the user and stores the refresh token in an HttpOnly cookie.
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validatedData = loginUserSchema.parse(req.body);
    const result = await loginUser(validatedData);

    const { refreshToken, ...publicResult } = result;

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: publicResult,
    });
  } catch (error) {
    next(error);
  }
}

// Validates and rotates the current refresh token.
export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    const result = await refreshSession(refreshToken);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Revokes the current refresh token and clears its cookie.
export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await revokeSession(refreshToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
}
