// Defines user API routes and applies authentication to protected endpoints.

import { Router } from "express";

import { registerUserController, getMeController } from "./user.controller.js";

import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

// Register a new user account.
router.post("/register", registerUserController);

// Retrieve the profile of the authenticated user.
router.get("/me", authenticate, getMeController);

export default router;
