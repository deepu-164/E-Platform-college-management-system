import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(error);

  if (error instanceof Error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}
