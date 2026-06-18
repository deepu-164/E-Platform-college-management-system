import { Router } from "express";

import { prisma } from "../db/prisma.js";
import { createBlogPostSchema, paginationQuerySchema } from "../schemas/index.js";
import { getPagination } from "../services/pagination.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const blogRouter = Router();

blogRouter.get("/", validateQuery(paginationQuerySchema), async (req, res, next) => {
  try {
    const { page, limit, search } = paginationQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { excerpt: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({ where, skip, take, orderBy: { publishedAt: "desc" } }),
      prisma.blogPost.count({ where })
    ]);

    res.json({ success: true, items, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

blogRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.blogPost.findUnique({ where: { id: req.params.id } });

    if (!item) {
      res.status(404).json({ success: false, message: "Blog post not found" });
      return;
    }

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

blogRouter.post("/", validateBody(createBlogPostSchema), async (req, res, next) => {
  try {
    const item = await prisma.blogPost.create({
      data: {
        ...req.body,
        publishedAt: req.body.publishedAt ?? new Date()
      }
    });
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});
