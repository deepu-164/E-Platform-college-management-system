import { UserRole } from "@prisma/client";
import { Router } from "express";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { createAuthToken } from "../lib/token.js";
import { requireAuth } from "../middleware/auth.js";
import { loginSchema, registerSchema } from "../schemas/index.js";
import { validateBody } from "../middleware/validate.js";

export const authRouter = Router();

function sanitizeUser(user: { id: string; name: string; email: string; role: UserRole; status: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  };
}

function getTokenExpiry(): number {
  return Math.floor(Date.now() / 1000) + env.AUTH_TOKEN_TTL_MINUTES * 60;
}

authRouter.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, message: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: UserRole.STUDENT
      }
    });

    const token = createAuthToken({
      sub: user.id,
      role: user.role,
      exp: getTokenExpiry()
    });

    res.status(201).json({ success: true, token, item: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const token = createAuthToken({
      sub: user.id,
      role: user.role,
      exp: getTokenExpiry()
    });

    res.json({ success: true, token, item: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({ success: true, item: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});
