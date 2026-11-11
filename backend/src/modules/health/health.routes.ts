// Provides a health-check endpoint for monitoring API availability.

import { Router } from "express";

const router = Router();

// Returns the current API health status.
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CryptoVerse API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
