import { Router } from "express";

import { prisma } from "../db/prisma.js";
import { mockQuestionQuerySchema, seatAllotmentQuerySchema } from "../schemas/index.js";

export const contentRouter = Router();

type Category = "general" | "obc" | "sc" | "st";

function predictNextCutoffLinear(cutoffs: { year: number; cutoff: number }[]): number {
  const n = cutoffs.length;
  if (n === 0) return 0;
  if (n === 1) return cutoffs[0].cutoff;

  const xs = cutoffs.map((item) => item.year);
  const ys = cutoffs.map((item) => item.cutoff);
  const xMean = xs.reduce((sum, value) => sum + value, 0) / n;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  const predicted = slope * 2026 + intercept;

  return Math.max(1000, Math.round(predicted));
}

function getCategoryMultiplier(category: Category): number {
  switch (category) {
    case "obc":
      return 1.1;
    case "sc":
      return 1.25;
    case "st":
      return 1.4;
    default:
      return 1;
  }
}

contentRouter.get("/careers", async (_req, res, next) => {
  try {
    const items = await prisma.careerRecommendation.findMany({ orderBy: { matchScore: "desc" } });
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/certifications", async (_req, res, next) => {
  try {
    const items = await prisma.certificationCourse.findMany({ orderBy: [{ rating: "desc" }, { enrolled: "desc" }] });
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/certifications/:id", async (req, res, next) => {
  try {
    const item = await prisma.certificationCourse.findUnique({ where: { id: req.params.id } });

    if (!item) {
      res.status(404).json({ success: false, message: "Certification not found" });
      return;
    }

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/mock-questions", async (req, res, next) => {
  try {
    const { examType, difficulty } = mockQuestionQuerySchema.parse(req.query);
    const primary = await prisma.mockQuestion.findMany({
      where: {
        ...(examType ? { examType } : {}),
        ...(difficulty ? { difficulty } : {})
      },
      orderBy: { createdAt: "asc" }
    });
    const seen = new Set(primary.map((item) => item.id));
    let items = [...primary];

    if (items.length < 10 && examType) {
      const sameExam = await prisma.mockQuestion.findMany({
        where: {
          examType,
          ...(difficulty ? { difficulty: { not: difficulty } } : {})
        },
        orderBy: { createdAt: "asc" }
      });
      items = [...items, ...sameExam.filter((item) => !seen.has(item.id))];
      items.forEach((item) => seen.add(item.id));
    }

    if (items.length < 10 && difficulty) {
      const sameDifficulty = await prisma.mockQuestion.findMany({
        where: {
          difficulty,
          ...(examType ? { examType: { not: examType } } : {})
        },
        orderBy: { createdAt: "asc" }
      });
      items = [...items, ...sameDifficulty.filter((item) => !seen.has(item.id))];
      items.forEach((item) => seen.add(item.id));
    }

    if (items.length < 10) {
      const remainder = await prisma.mockQuestion.findMany({
        orderBy: { createdAt: "asc" }
      });
      items = [...items, ...remainder.filter((item) => !seen.has(item.id))];
    }

    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/rank-cutoffs", async (_req, res, next) => {
  try {
    const items = await prisma.rankCutoff.findMany({ orderBy: { year: "asc" } });
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/rank-predictor", async (req, res, next) => {
  try {
    const rank = Number(req.query.rank);
    const category = String(req.query.category ?? "general").toLowerCase() as Category;

    if (!Number.isInteger(rank) || rank <= 0) {
      res.status(400).json({ success: false, message: "rank must be a positive integer" });
      return;
    }

    if (!["general", "obc", "sc", "st"].includes(category)) {
      res.status(400).json({ success: false, message: "category must be one of general|obc|sc|st" });
      return;
    }

    const [cutoffs, colleges] = await Promise.all([
      prisma.rankCutoff.findMany({ orderBy: { year: "asc" } }),
      prisma.college.findMany({ orderBy: { rank: "asc" } })
    ]);

    const cutoff2026 = predictNextCutoffLinear(cutoffs);
    const categoryMultiplier = getCategoryMultiplier(category);

    const ranked = colleges.map((college, index) => {
      const ratio = colleges.length <= 1 ? 0.85 : 0.65 + (index / (colleges.length - 1)) * 0.35;
      const predictedCutoff = Math.max(1000, Math.round(cutoff2026 * categoryMultiplier * ratio));
      const eligible = rank <= predictedCutoff;
      const gap = predictedCutoff - rank;

      return {
        id: college.id,
        name: college.name,
        collegeRank: college.rank,
        location: college.location,
        predictedCutoff,
        eligible,
        gap
      };
    });

    const eligibleColleges = ranked
      .filter((item) => item.eligible)
      .sort((a, b) => a.predictedCutoff - b.predictedCutoff);

    const nearMissColleges = ranked
      .filter((item) => !item.eligible)
      .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))
      .slice(0, 3);

    res.json({
      success: true,
      item: {
        rank,
        category,
        cutoff2026,
        eligibleCount: eligibleColleges.length,
        colleges: eligibleColleges,
        nearMissColleges
      }
    });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/seat-allotment-predictor", async (req, res, next) => {
  try {
    const { rank, category, round } = seatAllotmentQuerySchema.parse(req.query);
    const trends = await prisma.seatAllotmentTrend.findMany({
      where: {
        round,
        category: { in: [category.toLowerCase(), "general"] }
      },
      orderBy: [{ year: "desc" }, { cutoffRank: "asc" }]
    });

    const eligible = trends.filter((item) => rank <= item.cutoffRank);
    const grouped = eligible.reduce<Record<string, { collegeName: string; courseName: string; latestCutoff: number; years: number[] }>>((acc, item) => {
      const key = `${item.collegeName}-${item.courseName}`;
      if (!acc[key]) {
        acc[key] = {
          collegeName: item.collegeName,
          courseName: item.courseName,
          latestCutoff: item.cutoffRank,
          years: [item.year]
        };
      } else {
        acc[key].latestCutoff = Math.max(acc[key].latestCutoff, item.cutoffRank);
        acc[key].years.push(item.year);
      }
      return acc;
    }, {});

    res.json({
      success: true,
      item: {
        rank,
        round,
        category,
        colleges: Object.values(grouped).sort((a, b) => a.latestCutoff - b.latestCutoff).slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/live-updates", async (_req, res, next) => {
  try {
    const items = [
      {
        id: "cet-official",
        title: "KCET / PGCET Official Updates",
        summary: "Track the latest exam notifications, admit card updates, and counseling notices from the official authority.",
        url: "https://cetonline.karnataka.gov.in/kea/",
        source: "KEA",
        category: "CET",
        publishedAt: new Date().toISOString()
      },
      {
        id: "colleges-admissions",
        title: "College Admission Notice Boards",
        summary: "Use official college admission portals to confirm deadlines, eligibility changes, and counseling schedules.",
        url: "https://www.rvce.edu.in",
        source: "College",
        category: "Admissions",
        publishedAt: new Date().toISOString()
      }
    ];

    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});
