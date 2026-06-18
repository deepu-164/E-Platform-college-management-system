import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router } from "express";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import {
  applicationQuerySchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
  verifyPaymentSchema
} from "../schemas/index.js";
import { getPagination } from "../services/pagination.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);

function getPaymentAmount(payload: {
  type: "COLLEGE" | "CERTIFICATION";
  collegeId?: string;
  certificationCourseId?: string;
}, data: { college?: { feesPerYear: number | null } | null; certificationCourse?: { price: string | null } | null }): number | null {
  if (payload.type === "COLLEGE") {
    return data.college?.feesPerYear ?? null;
  }

  const rawPrice = data.certificationCourse?.price ?? "";
  const digits = rawPrice.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

applicationsRouter.get("/", validateQuery(applicationQuerySchema), async (req, res, next) => {
  try {
    const { page, limit, search, userId, collegeId, certificationCourseId, type, status } = applicationQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const effectiveUserId = req.auth?.role === "ADMIN" ? userId : req.auth?.sub;

    const where: Prisma.ApplicationWhereInput = {
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
      ...(collegeId ? { collegeId } : {}),
      ...(certificationCourseId ? { certificationCourseId } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { courseName: { contains: search, mode: "insensitive" } },
              { applicantName: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } },
              { college: { name: { contains: search, mode: "insensitive" } } },
              { certificationCourse: { title: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.application.findMany({
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
          college: true,
          certificationCourse: true
        },
        skip,
        take,
        orderBy: { appliedAt: "desc" }
      }),
      prisma.application.count({ where })
    ]);

    res.json({ success: true, items, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

applicationsRouter.get("/:id", async (req, res, next) => {
  try {
    const where: Prisma.ApplicationWhereUniqueInput = { id: req.params.id };
    const item = await prisma.application.findUnique({
      where,
      include: {
        college: true,
        certificationCourse: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!item) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    if (req.auth?.role !== "ADMIN" && item.userId !== req.auth?.sub) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

applicationsRouter.post("/", validateBody(createApplicationSchema), async (req, res, next) => {
  try {
    const payload = createApplicationSchema.parse(req.body);
    let targetData: { college?: { feesPerYear: number | null } | null; certificationCourse?: { price: string | null } | null } = {};

    if (payload.type === "COLLEGE") {
      const college = await prisma.college.findUnique({
        where: { id: payload.collegeId },
        select: { id: true, feesPerYear: true }
      });

      if (!college) {
        res.status(404).json({ success: false, message: "College not found" });
        return;
      }

      targetData = { college };
    }

    if (payload.type === "CERTIFICATION") {
      const certification = await prisma.certificationCourse.findUnique({
        where: { id: payload.certificationCourseId },
        select: { id: true, price: true }
      });

      if (!certification) {
        res.status(404).json({ success: false, message: "Certification not found" });
        return;
      }

      targetData = { certificationCourse: certification };
    }

    const paymentAmount = getPaymentAmount(payload, targetData);

    const item = await prisma.application.create({
      data: {
        userId: req.auth!.sub,
        type: payload.type,
        collegeId: payload.collegeId,
        certificationCourseId: payload.certificationCourseId,
        courseName: payload.courseName,
        applicantName: payload.applicantName,
        applicantEmail: payload.applicantEmail,
        applicantPhone: payload.applicantPhone,
        qualification: payload.qualification,
        scoreOrRank: payload.scoreOrRank,
        statement: payload.statement,
        requirementsSnapshot: payload.requirementsSnapshot,
        paymentAmount,
        paymentStatus: payload.status === "ACCEPTED" && paymentAmount ? "PENDING" : "NOT_READY",
        status: payload.status
      },
      include: {
        college: true,
        certificationCourse: true
      }
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

applicationsRouter.patch("/:id/status", validateBody(updateApplicationStatusSchema), async (req, res, next) => {
  try {
    const payload = updateApplicationStatusSchema.parse(req.body);
    const application = await prisma.application.findUnique({
      where: { id: req.params.id }
    });

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    if (req.auth?.role === "COLLEGE") {
      const manager = await prisma.user.findUnique({
        where: { id: req.auth!.sub },
        select: { managedCollegeId: true }
      });

      if (manager?.managedCollegeId !== application.collegeId) {
        res.status(403).json({ success: false, message: "College access required" });
        return;
      }
    } else if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: payload.status }
    });

    res.json({ success: true, item: updated });
  } catch (error) {
    next(error);
  }
});

applicationsRouter.post("/:id/create-payment-order", async (req, res, next) => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: {
        college: true,
        certificationCourse: true
      }
    });

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    if (req.auth?.role !== "ADMIN" && application.userId !== req.auth?.sub) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (application.status !== "ACCEPTED") {
      res.status(400).json({ success: false, message: "Payment is available only after acceptance" });
      return;
    }

    if (!application.paymentAmount) {
      res.status(400).json({ success: false, message: "No payment amount configured for this application" });
      return;
    }

    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      res.status(503).json({
        success: false,
        message: "Payment gateway is not configured. Add Razorpay credentials on the server to enable live transactions."
      });
      return;
    }

    const receipt = `app_${application.id}_${Date.now()}`;
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: application.paymentAmount * 100,
        currency: "INR",
        receipt,
        notes: {
          applicationId: application.id,
          applicationType: application.type
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(502).json({ success: false, message: `Payment gateway rejected the order request: ${errorText}` });
      return;
    }

    const order = await response.json() as { id: string; amount: number; currency: string };

    await prisma.application.update({
      where: { id: application.id },
      data: {
        paymentOrderId: order.id,
        paymentStatus: "PENDING"
      }
    });

    res.json({
      success: true,
      item: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        applicationId: application.id,
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        applicantPhone: application.applicantPhone
      }
    });
  } catch (error) {
    next(error);
  }
});

applicationsRouter.post("/:id/verify-payment", validateBody(verifyPaymentSchema), async (req, res, next) => {
  try {
    const application = await prisma.application.findUnique({ where: { id: req.params.id } });

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    if (req.auth?.role !== "ADMIN" && application.userId !== req.auth?.sub) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (!env.RAZORPAY_KEY_SECRET) {
      res.status(503).json({ success: false, message: "Payment verification is not configured on the server" });
      return;
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = verifyPaymentSchema.parse(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${application.paymentOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (application.paymentOrderId !== razorpayOrderId || expectedSignature !== razorpaySignature) {
      await prisma.application.update({
        where: { id: application.id },
        data: { paymentStatus: "FAILED" }
      });

      res.status(400).json({ success: false, message: "Payment signature verification failed" });
      return;
    }

    const item = await prisma.application.update({
      where: { id: application.id },
      data: {
        paymentStatus: "PAID",
        paymentReference: razorpayPaymentId
      },
      include: {
        college: true,
        certificationCourse: true
      }
    });

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});
