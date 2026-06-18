import { Router } from "express";

import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { updateCollegeSchema } from "../schemas/index.js";

export const collegeDashboardRouter = Router();

collegeDashboardRouter.use(requireAuth);

async function getManagedCollegeId(userId: string) {
  const manager = await prisma.user.findUnique({
    where: { id: userId },
    select: { managedCollegeId: true }
  });

  return manager?.managedCollegeId ?? null;
}

collegeDashboardRouter.get("/me", async (req, res, next) => {
  try {
    if (req.auth?.role !== "COLLEGE") {
      res.status(403).json({ success: false, message: "College access required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.sub },
      select: {
        id: true,
        name: true,
        email: true,
        managedCollege: {
          select: {
            id: true,
            name: true,
            location: true,
            type: true,
            rank: true,
            rating: true,
            feesPerYear: true,
            description: true,
            admissionRequirements: true,
            website: true,
            phone: true,
            email: true,
            established: true,
            courses: { select: { id: true, name: true, duration: true, feesPerYear: true, seats: true } }
          }
        }
      }
    });

    if (!user?.managedCollege) {
      res.status(404).json({ success: false, message: "Managed college not found for this account" });
      return;
    }

    const collegeId = user.managedCollege.id;
    const [inquiries, applications, appointments, reviews] = await Promise.all([
      prisma.inquiry.findMany({
        where: { collegeId },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      prisma.application.findMany({
        where: { collegeId },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { appliedAt: "desc" },
        take: 100
      }),
      prisma.appointment.findMany({
        where: { collegeId },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { scheduledFor: "asc" },
        take: 100
      }),
      prisma.collegeReview.findMany({
        where: { collegeId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 100
      })
    ]);

    res.json({
      success: true,
      item: {
        manager: { id: user.id, name: user.name, email: user.email },
        college: user.managedCollege,
        stats: {
          inquiries: inquiries.length,
          applications: applications.length,
          appointments: appointments.length,
          reviews: reviews.length
        },
        inquiries,
        applications,
        appointments,
        reviews
      }
    });
  } catch (error) {
    next(error);
  }
});

collegeDashboardRouter.patch("/me/college", validateBody(updateCollegeSchema), async (req, res, next) => {
  try {
    if (req.auth?.role !== "COLLEGE") {
      res.status(403).json({ success: false, message: "College access required" });
      return;
    }

    const managedCollegeId = await getManagedCollegeId(req.auth!.sub);

    if (!managedCollegeId) {
      res.status(404).json({ success: false, message: "Managed college not found for this account" });
      return;
    }

    const updates = updateCollegeSchema.parse(req.body);
    const item = await prisma.college.update({
      where: { id: managedCollegeId },
      data: updates,
      include: { courses: true }
    });

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});
