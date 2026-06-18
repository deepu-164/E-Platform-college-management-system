import { Router } from "express";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const seoRouter = Router();

seoRouter.get("/summary", requireAuth, async (req, res, next) => {
  try {
    if (req.auth?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const [collegeCount, blogCount, certificationCount] = await Promise.all([
      prisma.college.count(),
      prisma.blogPost.count(),
      prisma.certificationCourse.count()
    ]);

    res.json({
      success: true,
      item: {
        baseUrl: env.APP_BASE_URL,
        sitemapUrl: `${env.APP_BASE_URL}/sitemap.xml`,
        robotsUrl: `${env.APP_BASE_URL}/robots.txt`,
        pagesIndexed: {
          colleges: collegeCount,
          blogPosts: blogCount,
          certifications: certificationCount
        },
        recommendations: [
          "Submit the sitemap.xml URL in Google Search Console.",
          "Keep blog posts and college pages updated with unique content.",
          "Use descriptive titles and meta descriptions across key pages."
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});
