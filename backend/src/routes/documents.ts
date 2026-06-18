import { Router } from "express";

import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createUserDocumentSchema, updateUserDocumentSchema } from "../schemas/index.js";

export const documentsRouter = Router();

documentsRouter.use(requireAuth);

documentsRouter.get("/", async (req, res, next) => {
  try {
    const where = req.auth?.role === "ADMIN" ? {} : { userId: req.auth?.sub };
    const items = await prisma.userDocument.findMany({
      where,
      include: {
        application: {
          include: {
            college: true,
            certificationCourse: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/", validateBody(createUserDocumentSchema), async (req, res, next) => {
  try {
    const payload = createUserDocumentSchema.parse(req.body);
    const item = await prisma.userDocument.create({
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

documentsRouter.patch("/:id", validateBody(updateUserDocumentSchema), async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const payload = updateUserDocumentSchema.parse(req.body);
    const item = await prisma.userDocument.update({
      where: { id: req.params.id },
      data: {
        ...payload,
        verifiedAt: payload.status === "VERIFIED" ? new Date() : null
      }
    });

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});
