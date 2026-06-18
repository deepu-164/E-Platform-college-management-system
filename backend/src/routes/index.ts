import { Router } from "express";

import { appointmentsRouter } from "./appointments.js";
import { applicationsRouter } from "./applications.js";
import { adminContentRouter } from "./admin-content.js";
import { authRouter } from "./auth.js";
import { blogRouter } from "./blog.js";
import { collegeDashboardRouter } from "./college-dashboard.js";
import { collegesRouter } from "./colleges.js";
import { contentRouter } from "./content.js";
import { documentsRouter } from "./documents.js";
import { inquiriesRouter } from "./inquiries.js";
import { integrationsRouter } from "./integrations.js";
import { interactionsRouter } from "./interactions.js";
import { offlineInquiriesRouter } from "./offline-inquiries.js";
import { seoRouter } from "./seo.js";
import { usersRouter } from "./users.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "e-platform-backend",
    timestamp: new Date().toISOString()
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/colleges", collegesRouter);
apiRouter.use("/college-dashboard", collegeDashboardRouter);
apiRouter.use("/appointments", appointmentsRouter);
apiRouter.use("/applications", applicationsRouter);
apiRouter.use("/admin-content", adminContentRouter);
apiRouter.use("/inquiries", inquiriesRouter);
apiRouter.use("/offline-inquiries", offlineInquiriesRouter);
apiRouter.use("/blog-posts", blogRouter);
apiRouter.use("/content", contentRouter);
apiRouter.use("/seo", seoRouter);
apiRouter.use("/integrations", integrationsRouter);
apiRouter.use("/interactions", interactionsRouter);
apiRouter.use("/documents", documentsRouter);


