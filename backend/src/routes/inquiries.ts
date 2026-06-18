import { Prisma } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../db/prisma.js";
import { createInquirySchema, inquiryQuerySchema, updateInquirySchema } from "../schemas/index.js";
import { getPagination } from "../services/pagination.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

export const inquiriesRouter = Router();

inquiriesRouter.use(requireAuth);

inquiriesRouter.get("/", validateQuery(inquiryQuerySchema), async (req, res, next) => {
  try {
    const { page, limit, search, status } = inquiryQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.InquiryWhereInput = {
      ...(req.auth?.role === "ADMIN" ? {} : { userId: req.auth?.sub }),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { message: { contains: search, mode: "insensitive" } },
              { courseName: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } },
              { college: { name: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true
            }
          },
          college: true
        },
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      prisma.inquiry.count({ where })
    ]);

    res.json({ success: true, items, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

inquiriesRouter.post("/", validateBody(createInquirySchema), async (req, res, next) => {
  try {
    const { collegeId, courseName, message, status } = createInquirySchema.parse(req.body);

    const item = await prisma.inquiry.create({
      data: {
        userId: req.auth!.sub,
        collegeId,
        courseName,
        message,
        status
      }
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

inquiriesRouter.patch("/:id", validateBody(updateInquirySchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = updateInquirySchema.parse(req.body);

    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
      select: { id: true, userId: true, collegeId: true }
    });

    if (!inquiry) {
      res.status(404).json({ success: false, message: "Inquiry not found" });
      return;
    }

    if (req.auth?.role === "COLLEGE") {
      const manager = await prisma.user.findUnique({
        where: { id: req.auth.sub },
        select: { managedCollegeId: true }
      });

      if (manager?.managedCollegeId !== inquiry.collegeId) {
        res.status(403).json({ success: false, message: "Forbidden" });
        return;
      }
    } else if (req.auth?.role !== "ADMIN" && inquiry.userId !== req.auth?.sub) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const item = await prisma.inquiry.update({
      where: { id },
      data: updates,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, status: true } },
        college: true
      }
    });

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});
