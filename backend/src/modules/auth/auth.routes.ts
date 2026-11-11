// Defines authentication routes for login, refresh, and logout.

import { Router } from "express";

import {
  loginController,
  refreshController,
  logoutController,
} from "./auth.controller.js";

const router = Router();

// Authenticates a user and creates a refresh token session.
router.post("/login", loginController);

// Rotates the refresh token and returns a new access token.
router.post("/refresh", refreshController);

// Revokes the current refresh token session.
router.post("/logout", logoutController);

export default router;
