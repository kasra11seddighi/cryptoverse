// Manages user registration, authentication, profile retrieval, and refresh token persistence.

import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

import User from "./user.model.js";
import RefreshToken from "../auth/refresh-token.model.js";

import { AppError } from "../../shared/errors/AppError.js";

import { generateTokens } from "../auth/jwt.service.js";
import type { TokenPayload } from "../auth/jwt.service.js";

import type { RegisterUserInput, LoginUserInput } from "./user.validation.js";

// Registers a new user after checking email uniqueness and hashing the password.
export async function registerUser(input: RegisterUserInput) {
  const existingUser = await User.findOne({
    email: input.email,
  });

  if (existingUser) {
    throw new AppError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  // Returns only public user information.
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// Authenticates a user, generates tokens, and stores the refresh token hash.
export async function loginUser(input: LoginUserInput) {
  const user = await User.findOne({
    email: input.email,
  }).select("+passwordHash");

  // Uses a generic error to avoid revealing whether an email exists.
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  // Creates the identity payload used to generate authentication tokens.
  const payload: TokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const tokens = generateTokens(payload);

  // Hashes the refresh token before storing it in MongoDB.
  const tokenHash = createHash("sha256")
    .update(tokens.refreshToken)
    .digest("hex");

  // Creates a refresh token session with a seven-day expiration.
  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    familyId: tokens.familyId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
  });

  // Returns authentication tokens and public user information.
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

// Retrieves a user's public profile using their database identifier.
export async function getUserById(userId: string) {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
