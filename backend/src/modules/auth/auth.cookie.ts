// Defines secure cookie settings for refresh token management.

import type { CookieOptions } from "express";

// Defines the refresh token cookie name.
export const REFRESH_COOKIE_NAME = "cryptoverse_refresh";

// Defines shared cookie security options.
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
