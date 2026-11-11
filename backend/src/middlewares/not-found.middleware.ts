// Returns a standardized 404 response for undefined API routes.

import type { Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
}
