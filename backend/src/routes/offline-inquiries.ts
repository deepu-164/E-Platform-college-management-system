import { Router } from "express";

import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createOfflineInquirySchema } from "../schemas/index.js";

export const offlineInquiriesRouter = Router();

offlineInquiriesRouter.use(requireAuth);

offlineInquiriesRouter.get("/", async (req, res, next) => {
  try {
    const where = req.auth?.role === "ADMIN" ? {} : { userId: req.auth?.sub };
    const items = await prisma.offlineInquiry.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

offlineInquiriesRouter.post("/", validateBody(createOfflineInquirySchema), async (req, res, next) => {
  try {
    const payload = createOfflineInquirySchema.parse(req.body);
    const item = await prisma.offlineInquiry.create({
      data: {
        userId: req.auth!.sub,
        ...payload
      }
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});
