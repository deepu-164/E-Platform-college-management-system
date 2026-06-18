import type { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "../lib/token.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Authorization token is required" });
    return;
  }

  const token = header.replace("Bearer ", "").trim();
  const payload = verifyAuthToken(token);

  if (!payload) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
    return;
  }

  req.auth = payload;
  next();
}
