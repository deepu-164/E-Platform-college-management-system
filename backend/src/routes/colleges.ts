import { Prisma } from "@prisma/client";
import { Router, type Request, type Response } from "express";

import { prisma } from "../db/prisma.js";
import { collegeQuerySchema, createCollegeReviewSchema, createCollegeSchema, updateCollegeSchema } from "../schemas/index.js";
import { requireAuth } from "../middleware/auth.js";
import { getPagination } from "../services/pagination.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const collegesRouter = Router();

collegesRouter.get("/", validateQuery(collegeQuerySchema), async (req, res, next) => {
  try {
    const { page, limit, search, location, type, startsWith, sortBy, sortOrder } = collegeQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.CollegeWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { courses: { some: { name: { contains: search, mode: "insensitive" } } } }
            ]
          }
        : {}),
      ...(location ? { location: { equals: location, mode: "insensitive" } } : {}),
      ...(type ? { type: { equals: type, mode: "insensitive" } } : {}),
      ...(startsWith ? { name: { startsWith, mode: "insensitive" } } : {})
    };

    const [items, total] = await Promise.all([
      prisma.college.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          location: true,
          type: true,
          rank: true,
          rating: true,
          feesPerYear: true,
          courses: {
            select: {
              id: true,
              name: true
            },
            orderBy: { name: "asc" }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.college.count({ where })
    ]);

    res.json({ success: true, items, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

function aggregateMeta(values: string[]): { value: string; count: number }[] {
  const byKey = new Map<string, { value: string; count: number }>();

  values.forEach((rawValue) => {
    const value = rawValue.trim();
    const key = value.toLowerCase();
    const existing = byKey.get(key);

    if (existing) {
      existing.count += 1;
      if (value.length < existing.value.length) {
        existing.value = value;
      }
      return;
    }

    byKey.set(key, { value, count: 1 });
  });

  return [...byKey.values()].sort((a, b) => a.value.localeCompare(b.value));
}

collegesRouter.get("/meta", async (_req, res, next) => {
  try {
    const colleges = await prisma.college.findMany({
      select: {
        location: true,
        type: true
      }
    });

    const locations = aggregateMeta(colleges.map((college) => college.location));
    const types = aggregateMeta(colleges.map((college) => college.type));

    res.json({
      success: true,
      item: {
        locations,
        types,
        topCities: [...locations]
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((item) => ({ value: item.value, count: item.count }))
      }
    });
  } catch (error) {
    next(error);
  }
});

collegesRouter.get("/:id", async (req, res, next) => {
  try {
    const college = await prisma.college.findUnique({
      where: { id: req.params.id },
      include: {
        courses: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 20
        },
        applications: {
          take: 10,
          orderBy: { appliedAt: "desc" }
        }
      }
    });

    if (!college) {
      res.status(404).json({ success: false, message: "College not found" });
      return;
    }

    res.json({ success: true, item: college });
  } catch (error) {
    next(error);
  }
});

collegesRouter.post("/:id/reviews", requireAuth, validateBody(createCollegeReviewSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = createCollegeReviewSchema.parse(req.body);

    const college = await prisma.college.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!college) {
      res.status(404).json({ success: false, message: "College not found" });
      return;
    }

    const item = await prisma.collegeReview.upsert({
      where: {
        userId_collegeId: {
          userId: req.auth!.sub,
          collegeId: id
        }
      },
      update: payload,
      create: {
        userId: req.auth!.sub,
        collegeId: id,
        ...payload
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const aggregate = await prisma.collegeReview.aggregate({
      where: { collegeId: id },
      _avg: { rating: true }
    });

    await prisma.college.update({
      where: { id },
      data: {
        rating: Number((aggregate._avg.rating ?? 0).toFixed(1))
      }
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

function requireAdmin(req: Request, res: Response): boolean {
  if (req.auth?.role !== "ADMIN") {
    res.status(403).json({ success: false, message: "Admin access required" });
    return false;
  }
  return true;
}

collegesRouter.patch("/:id", requireAuth, validateBody(updateCollegeSchema), async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const payload = updateCollegeSchema.parse(req.body);
    const college = await prisma.college.update({ where: { id: req.params.id }, data: payload });
    res.json({ success: true, item: college });
  } catch (error) {
    next(error);
  }
});

collegesRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await prisma.college.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

collegesRouter.post("/", requireAuth, validateBody(createCollegeSchema), async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const college = await prisma.college.create({ data: req.body });
    res.status(201).json({ success: true, item: college });
  } catch (error) {
    next(error);
  }
});




