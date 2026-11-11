// Defines Zod validation schemas for user-related requests.

import { z } from "zod";

// Validates the data required to register a new user.
export const registerUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),
});

// Validates the data required to log in.
export const loginUserSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .transform((value) => value.toLowerCase()),

  password: z.string().min(1, "Password is required"),
});

// Exports inferred TypeScript types from the validation schemas.
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
