import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteSettingsPath = path.resolve(__dirname, "../../data/site-settings.json");

const certificationSchema = z.object({
  title: z.string().min(2),
  provider: z.string().min(2),
  duration: z.string().min(2),
  enrolled: z.number().int().min(0),
  rating: z.number().min(0).max(5),
  level: z.string().min(2),
  price: z.string().min(1),
  description: z.string().min(10),
  requirements: z.array(z.string().min(2)).min(1)
});

const mockQuestionSchema = z.object({
  examType: z.string().min(2),
  difficulty: z.string().min(2),
  question: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().optional()
});

const blogPostAdminSchema = z.object({
  title: z.string().min(5),
  excerpt: z.string().min(10),
  content: z.string().min(20),
  externalUrl: z.string().url().optional().or(z.literal("")),
  author: z.string().min(2),
  category: z.string().min(2),
  readTime: z.string().min(2),
  publishedAt: z.string().datetime().optional().or(z.literal(""))
});

const socialLinkSchema = z.object({
  label: z.string().min(2),
  href: z.string().url(),
  icon: z.enum(["MessageCircle", "Send", "Instagram", "Facebook", "Youtube"])
});

const siteSettingsSchema = z.object({
  brandTagline: z.string().min(5),
  connectText: z.string().min(10),
  socialLinks: z.array(socialLinkSchema).min(1)
});

const defaultSiteSettings = {
  brandTagline: "College search, applications, exam practice, and counseling guidance through one cleaner student-first experience.",
  connectText: "Official social channels for notices, videos, updates, and student support.",
  socialLinks: [
    { label: "WhatsApp", href: "https://wa.me/919876543210", icon: "MessageCircle" },
    { label: "Telegram", href: "https://t.me/eplatform_updates", icon: "Send" },
    { label: "Instagram", href: "https://www.instagram.com/eplatform.india", icon: "Instagram" },
    { label: "Facebook", href: "https://www.facebook.com/eplatform.india", icon: "Facebook" },
    { label: "YouTube", href: "https://www.youtube.com/@eplatformindia", icon: "Youtube" }
  ]
};

async function readSiteSettings() {
  try {
    const raw = await fs.readFile(siteSettingsPath, "utf8");
    return siteSettingsSchema.parse(JSON.parse(raw));
  } catch {
    await fs.mkdir(path.dirname(siteSettingsPath), { recursive: true });
    await fs.writeFile(siteSettingsPath, JSON.stringify(defaultSiteSettings, null, 2));
    return defaultSiteSettings;
  }
}

function requireAdmin(req: Parameters<Router["use"]>[0] extends never ? never : any, res: any): boolean {
  if (req.auth?.role !== "ADMIN") {
    res.status(403).json({ success: false, message: "Admin access required" });
    return false;
  }
  return true;
}

export const adminContentRouter = Router();

adminContentRouter.get("/site-settings", async (_req, res, next) => {
  try {
    const item = await readSiteSettings();
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.use(requireAuth);

adminContentRouter.get("/certifications", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const items = await prisma.certificationCourse.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.post("/certifications", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const payload = certificationSchema.parse(req.body);
    const item = await prisma.certificationCourse.create({ data: payload });
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.patch("/certifications/:id", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const payload = certificationSchema.partial().parse(req.body);
    const item = await prisma.certificationCourse.update({ where: { id: req.params.id }, data: payload });
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.delete("/certifications/:id", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await prisma.certificationCourse.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.get("/mock-questions", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const items = await prisma.mockQuestion.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.post("/mock-questions", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const payload = mockQuestionSchema.parse(req.body);
    const item = await prisma.mockQuestion.create({ data: payload });
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.patch("/mock-questions/:id", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const payload = mockQuestionSchema.partial().parse(req.body);
    const item = await prisma.mockQuestion.update({ where: { id: req.params.id }, data: payload });
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.delete("/mock-questions/:id", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await prisma.mockQuestion.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.get("/blog-posts", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const items = await prisma.blogPost.findMany({ orderBy: { publishedAt: "desc" } });
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.post("/blog-posts", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const payload = blogPostAdminSchema.parse(req.body);
    const item = await prisma.blogPost.create({
      data: {
        ...payload,
        externalUrl: payload.externalUrl || undefined,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : new Date()
      }
    });
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.patch("/blog-posts/:id", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const payload = blogPostAdminSchema.partial().parse(req.body);
    const item = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: {
        ...payload,
        externalUrl: payload.externalUrl === "" ? undefined : payload.externalUrl,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : undefined
      }
    });
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.delete("/blog-posts/:id", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

adminContentRouter.patch("/site-settings", async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const payload = siteSettingsSchema.parse(req.body);
    await fs.mkdir(path.dirname(siteSettingsPath), { recursive: true });
    await fs.writeFile(siteSettingsPath, JSON.stringify(payload, null, 2));
    res.json({ success: true, item: payload });
  } catch (error) {
    next(error);
  }
});
