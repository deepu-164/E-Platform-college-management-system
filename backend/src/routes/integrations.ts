import { Router } from "express";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const integrationsRouter = Router();

integrationsRouter.use(requireAuth);

integrationsRouter.get("/leads.csv", async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const inquiries = await prisma.inquiry.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true, city: true } },
        college: { select: { name: true, location: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const header = ["Lead Date", "Student Name", "Student Email", "Phone", "City", "College", "Location", "Course", "Status", "Message"];
    const rows = inquiries.map((item) => [
      item.createdAt.toISOString(),
      item.user.name,
      item.user.email,
      item.user.phone ?? "",
      item.user.city ?? "",
      item.college.name,
      item.college.location,
      item.courseName,
      item.status,
      item.message.replace(/"/g, '""')
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=e-platform-leads.csv");
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

integrationsRouter.post("/google-sheets/sync", async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    if (!env.GOOGLE_SHEETS_WEBHOOK_URL) {
      res.status(503).json({ success: false, message: "GOOGLE_SHEETS_WEBHOOK_URL is not configured" });
      return;
    }

    const inquiries = await prisma.inquiry.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true, city: true } },
        college: { select: { name: true, location: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      source: "E-platform",
      items: inquiries.map((item) => ({
        createdAt: item.createdAt.toISOString(),
        studentName: item.user.name,
        studentEmail: item.user.email,
        phone: item.user.phone,
        city: item.user.city,
        collegeName: item.college.name,
        collegeLocation: item.college.location,
        courseName: item.courseName,
        status: item.status,
        message: item.message
      }))
    };

    const response = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(502).json({ success: false, message: `Google Sheets sync failed: ${text}` });
      return;
    }

    res.json({ success: true, item: { exportedCount: payload.items.length } });
  } catch (error) {
    next(error);
  }
});
