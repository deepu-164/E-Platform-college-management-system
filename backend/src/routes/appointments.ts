import { AppointmentStatus, Prisma } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../db/prisma.js";
import {
  appointmentQuerySchema,
  createAppointmentSchema,
  updateAppointmentSchema
} from "../schemas/index.js";
import { getPagination } from "../services/pagination.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

export const appointmentsRouter = Router();

appointmentsRouter.use(requireAuth);

appointmentsRouter.get("/", validateQuery(appointmentQuerySchema), async (req, res, next) => {
  try {
    const { page, limit, search, status, collegeId } = appointmentQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.AppointmentWhereInput = {
      ...(req.auth?.role === "ADMIN" ? {} : { userId: req.auth?.sub }),
      ...(status ? { status } : {}),
      ...(collegeId ? { collegeId } : {}),
      ...(search
        ? {
            OR: [
              { notes: { contains: search, mode: "insensitive" } },
              { counselorName: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } },
              { college: { name: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          college: {
            select: {
              id: true,
              name: true,
              location: true
            }
          }
        },
        skip,
        take,
        orderBy: { scheduledFor: "asc" }
      }),
      prisma.appointment.count({ where })
    ]);

    res.json({ success: true, items, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

appointmentsRouter.post("/", validateBody(createAppointmentSchema), async (req, res, next) => {
  try {
    const { collegeId, scheduledFor, mode, notes } = createAppointmentSchema.parse(req.body);

    const item = await prisma.appointment.create({
      data: {
        userId: req.auth!.sub,
        collegeId,
        scheduledFor,
        mode,
        notes
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      }
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

appointmentsRouter.patch("/:id", validateBody(updateAppointmentSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = updateAppointmentSchema.parse(req.body);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, userId: true, collegeId: true, status: true }
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: "Appointment not found" });
      return;
    }

    const isAdmin = req.auth?.role === "ADMIN";
    const isOwner = appointment.userId === req.auth?.sub;
    let isCollegeManager = false;

    if (req.auth?.role === "COLLEGE") {
      const manager = await prisma.user.findUnique({
        where: { id: req.auth.sub },
        select: { managedCollegeId: true }
      });
      isCollegeManager = manager?.managedCollegeId === appointment.collegeId;
    }

    if (!isAdmin && !isOwner && !isCollegeManager) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (!isAdmin && !isCollegeManager) {
      const allowedStudentUpdate =
        Object.keys(updates).length === 1 && updates.status === AppointmentStatus.CANCELED;

      if (!allowedStudentUpdate) {
        res.status(403).json({ success: false, message: "Students can only cancel their own appointments" });
        return;
      }
    }

    const item = await prisma.appointment.update({
      where: { id },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        college: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      }
    });

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});


