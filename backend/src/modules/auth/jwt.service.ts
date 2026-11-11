// Creates and verifies access and refresh JWTs with unique session identifiers.

import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

// Loads JWT secrets from environment variables.
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Prevents the application from starting without configured secrets.
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets are not configured");
}

// Defines the identity information stored in authentication tokens.
export interface TokenPayload {
  userId: string;
  role: "user" | "admin";
}

// Defines the additional identifiers stored in refresh tokens.
export interface RefreshTokenPayload extends TokenPayload {
  jti: string;
  familyId: string;
}

// Generates a short-lived access token and a unique refresh token.
export function generateTokens(
  payload: TokenPayload,
  familyId: string = randomUUID(),
) {
  const refreshTokenId = randomUUID();

  const accessToken = jwt.sign(payload, ACCESS_SECRET!, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    {
      ...payload,
      jti: refreshTokenId,
      familyId,
    },
    REFRESH_SECRET!,
    {
      expiresIn: "7d",
    },
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenId,
    familyId,
  };
}

// Verifies an access token and validates its payload.
export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET!);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    (decoded.role !== "user" && decoded.role !== "admin")
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
  };
}

// Verifies a refresh token and validates its session identifiers.
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, REFRESH_SECRET!);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    (decoded.role !== "user" && decoded.role !== "admin") ||
    typeof decoded.jti !== "string" ||
    typeof decoded.familyId !== "string"
  ) {
    throw new Error("Invalid refresh token payload");
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
    jti: decoded.jti,
    familyId: decoded.familyId,
  };
}
