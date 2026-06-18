import { Prisma } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../db/prisma.js";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  paginationQuerySchema,
  updateProfileSchema
} from "../schemas/index.js";
import { getPagination } from "../services/pagination.js";
import { hashPassword } from "../lib/password.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.post("/", validateBody(adminCreateUserSchema), async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const payload = adminCreateUserSchema.parse(req.body);
    const passwordHash = await hashPassword(payload.password);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
        role: payload.role,
        status: payload.status,
        phone: payload.phone,
        city: payload.city,
        bio: payload.bio,
        avatarUrl: payload.avatarUrl,
        targetCourse: payload.targetCourse,
        managedCollegeId: payload.role === "COLLEGE" ? payload.managedCollegeId : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        managedCollegeId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({ success: true, item: user });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/me/profile", validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const item = await prisma.user.update({
      where: { id: req.auth!.sub },
      data: payload,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        bio: true,
        avatarUrl: true,
        targetCourse: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:id", validateBody(adminUpdateUserSchema), async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const payload = adminUpdateUserSchema.parse(req.body);
    const updateData = {
      ...payload,
      managedCollegeId: payload.role === "COLLEGE" || payload.managedCollegeId !== undefined ? payload.managedCollegeId ?? null : undefined
    };

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        city: true,
        bio: true,
        targetCourse: true,
        managedCollegeId: true,
        updatedAt: true
      }
    });

    res.json({ success: true, item: user });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/:id", async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/", validateQuery(paginationQuerySchema), async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const { page, limit, search } = paginationQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          managedCollegeId: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({ success: true, items, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/me/profile", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        bio: true,
        avatarUrl: true,
        targetCourse: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({ success: true, item: user });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN" && req.auth?.sub !== req.params.id) {
      res.status(403).json({ success: false, message: "You can only view your own profile" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        applications: true,
        inquiries: true,
        examAttempts: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    res.json({ success: true, item: safeUser });
  } catch (error) {
    next(error);
  }
});
