// Handles HTTP requests related to user registration and profile retrieval.

import type { Request, Response, NextFunction } from "express";

import { registerUser, getUserById } from "./user.service.js";

import { registerUserSchema } from "./user.validation.js";

// Handles the registration endpoint and returns the created user's public data.
export async function registerUserController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate incoming registration data before passing it to the service.
    const validatedData = registerUserSchema.parse(req.body);

    // Register the user and retrieve their public information.
    const user = await registerUser(validatedData);

    // Return a successful response without exposing sensitive fields.
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    // Forward errors to the centralized error handler.
    next(error);
  }
}

// Returns the profile of the currently authenticated user.
export async function getMeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Ensure the authentication middleware has identified the user.
    if (!req.user) {
      throw new Error("Authenticated user information is missing");
    }

    // Retrieve the authenticated user's public profile.
    const user = await getUserById(req.user.userId);

    // Return the user's profile.
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    // Forward errors to the centralized error handler.
    next(error);
  }
}
