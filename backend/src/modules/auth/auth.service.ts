// Manages refresh token rotation, replay detection, and atomic session updates.

import mongoose from "mongoose";
import { createHash } from "node:crypto";

import RefreshToken from "./refresh-token.model.js";
import { generateTokens, verifyRefreshToken } from "./jwt.service.js";

import User from "../users/user.model.js";
import { AppError } from "../../shared/errors/AppError.js";

interface RefreshSessionResult {
  accessToken: string;
  refreshToken: string;
}

type TransactionResult = RefreshSessionResult | "replay" | null;

// Creates a SHA-256 hash for secure refresh token storage and lookup.
function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Validates, consumes, and replaces a refresh token atomically.
export async function refreshSession(
  refreshToken: string,
): Promise<RefreshSessionResult> {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const session = await mongoose.startSession();

  let transactionResult: TransactionResult = null;

  try {
    // Executes refresh token rotation inside a MongoDB transaction.
    transactionResult = await session.withTransaction<TransactionResult>(
      async () => {
        const now = new Date();

        // Atomically consumes the active refresh token.
        const consumedToken = await RefreshToken.findOneAndUpdate(
          {
            tokenHash,
            userId: payload.userId,
            familyId: payload.familyId,
            revokedAt: null,
            expiresAt: { $gt: now },
          },
          {
            $set: { revokedAt: now },
          },
          {
            new: true,
            session,
          },
        );

        // Checks whether a failed lookup represents actual token reuse.
        if (!consumedToken) {
          const existingToken = await RefreshToken.findOne({
            tokenHash,
            userId: payload.userId,
            familyId: payload.familyId,
          }).session(session);

          // Revokes the family only when a known token was already consumed.
          if (existingToken?.revokedAt) {
            await RefreshToken.updateMany(
              {
                familyId: payload.familyId,
                revokedAt: null,
              },
              {
                $set: { revokedAt: now },
              },
              { session },
            );

            return "replay";
          }

          return null;
        }

        // Loads the user and retrieves the latest role.
        const user = await User.findById(payload.userId).session(session);

        if (!user) {
          await RefreshToken.updateMany(
            {
              familyId: payload.familyId,
              revokedAt: null,
            },
            {
              $set: { revokedAt: now },
            },
            { session },
          );

          return null;
        }

        // Generates replacement tokens for the existing session family.
        const tokens = generateTokens(
          {
            userId: user._id.toString(),
            role: user.role,
          },
          payload.familyId,
        );

        // Stores only the hash of the new refresh token.
        await RefreshToken.create(
          [
            {
              userId: user._id,
              tokenHash: hashRefreshToken(tokens.refreshToken),
              familyId: tokens.familyId,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              revokedAt: null,
            },
          ],
          { session },
        );

        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      },
    );
  } finally {
    // Releases the MongoDB session after transaction completion.
    await session.endSession();
  }

  // Rejects a refresh token that has already been consumed.
  if (transactionResult === "replay") {
    throw new AppError(
      "Refresh token reuse detected. Session family revoked.",
      401,
    );
  }

  // Rejects invalid, expired, or otherwise unusable refresh tokens.
  if (!transactionResult) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  return transactionResult;
}

// Revokes the active refresh token associated with the current session.
export async function revokeSession(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);

  await RefreshToken.updateOne(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
  );
}
