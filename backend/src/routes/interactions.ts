import { Router } from "express";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import {
  chatPromptSchema,
  createChatMessageSchema,
  createMockExamAttemptSchema,
  paginationQuerySchema
} from "../schemas/index.js";
import { getPagination } from "../services/pagination.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

export const interactionsRouter = Router();

interactionsRouter.use(requireAuth);

function isOutOfScopeQuestion(lower: string): boolean {
  return ["weather", "temperature", "rain", "news", "stock", "bitcoin", "sports score"].some((term) => lower.includes(term));
}

function buildPromptTokens(message: string): string[] {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreText(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  return tokens.reduce((score, token) => (lower.includes(token) ? score + 1 : score), 0);
}

async function fetchOpenAIResponse(message: string, contextBlock: string, history: { role: "user" | "assistant"; content: string }[]): Promise<string | null> {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are the AI assistant for an education portal. Reply like a capable conversational assistant, not like a scripted FAQ bot. Be natural, direct, and helpful. Use the supplied portal data when it is relevant, but do not dump raw data unless the user asks. If the user asks about information you do not actually have, say that clearly and offer the closest useful help. If the question is unrelated to the portal but still answerable from general knowledge, answer normally unless it requires real-time information."
            }
          ]
        },
        ...history.map((item) => ({
          role: item.role,
          content: [
            {
              type: "input_text",
              text: item.content
            }
          ]
        })),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Portal context:\n${contextBlock}\n\nUser question:\n${message}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { output_text?: string };
  return data.output_text?.trim() || null;
}

function buildDynamicFallback(message: string, ranked: {
  colleges: Array<{
    name: string;
    location: string;
    type: string;
    rating: number;
    description: string;
    admissionRequirements: string[];
    courses: Array<{ name: string; duration: string; feesPerYear: number }>;
  }>;
  certifications: Array<{
    title: string;
    provider: string;
    level: string;
    duration: string;
    price: string;
    description: string;
    requirements: string[];
  }>;
  posts: Array<{
    title: string;
    category: string;
    excerpt: string;
    readTime: string;
  }>;
}): string {
  const lower = message.toLowerCase();

  if (isOutOfScopeQuestion(lower)) {
    return "I can help conversationally, but this local setup does not have live web access for things like current weather or news. If you want ChatGPT-like broader answers, add an OpenAI API key on the backend so the assistant can use a real model.";
  }

  if (ranked.colleges.length > 0) {
    const top = ranked.colleges[0];
    const alternatives = ranked.colleges.slice(1, 3).map((college) => college.name);
    const intro = lower.includes("best") || lower.includes("top")
      ? `From the colleges currently in this portal, ${top.name} looks like the strongest fit.`
      : `${top.name} looks like the closest match from the colleges currently loaded in the portal.`;
    const courseText = top.courses.slice(0, 3).map((course) => course.name).join(", ");
    const altText = alternatives.length > 0 ? ` Other nearby matches are ${alternatives.join(" and ")}.` : "";
    return `${intro} It is in ${top.location}, rated ${top.rating.toFixed(1)}/5, and offers ${courseText}.${altText} If you want, I can compare fees, requirements, or course options next.`;
  }

  if (ranked.certifications.length > 0) {
    const top = ranked.certifications[0];
    return `${top.title} looks relevant here. It is offered by ${top.provider}, runs for ${top.duration}, is marked ${top.level}, and is priced at ${top.price}. If you want, I can also compare it with other certifications in the portal.`;
  }

  if (ranked.posts.length > 0) {
    const top = ranked.posts[0];
    return `There is a related article in the portal: "${top.title}" under ${top.category}. It looks like the best match for your question, and I can also summarize it for you if you want.`;
  }

  return "I can chat more naturally once a real model is connected. Right now this assistant is limited to local portal data like colleges, certifications, blog posts, applications, and mock exams. If you want, I can help you wire in an OpenAI key next.";
}

async function getBotResponse(message: string, userId: string): Promise<string> {
  const lower = message.toLowerCase();
  const tokens = buildPromptTokens(message);

  const [colleges, certifications, posts, history] = await Promise.all([
    prisma.college.findMany({
      include: { courses: { select: { name: true, duration: true, feesPerYear: true } } },
      take: 12,
      orderBy: [{ rating: "desc" }, { rank: "asc" }]
    }),
    prisma.certificationCourse.findMany({
      take: 8,
      orderBy: [{ rating: "desc" }, { enrolled: "desc" }]
    }),
    prisma.blogPost.findMany({
      take: 6,
      orderBy: { publishedAt: "desc" }
    }),
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        role: true,
        content: true
      }
    })
  ]);

  const contextBlock = JSON.stringify({
    colleges: colleges.map((college) => ({
      name: college.name,
      location: college.location,
      type: college.type,
      rating: college.rating,
      requirements: college.admissionRequirements,
      courses: college.courses.map((course) => course.name)
    })),
    certifications: certifications.map((course) => ({
      title: course.title,
      provider: course.provider,
      level: course.level,
      duration: course.duration,
      price: course.price,
      requirements: course.requirements
    })),
    blogPosts: posts.map((post) => ({
      title: post.title,
      category: post.category,
      excerpt: post.excerpt
    }))
  });

  const normalizedHistory = history
    .filter((item): item is { role: "user" | "assistant"; content: string } => item.role === "user" || item.role === "assistant")
    .reverse();

  const modelReply = await fetchOpenAIResponse(message, contextBlock, normalizedHistory);
  if (modelReply) {
    return modelReply;
  }

  const rankedColleges = colleges
    .map((college) => ({
      college,
      score:
        scoreText(
          [
            college.name,
            college.location,
            college.type,
            college.description,
            college.admissionRequirements.join(" "),
            college.courses.map((course) => `${course.name} ${course.duration}`).join(" ")
          ].join(" "),
          tokens
        ) + (lower.includes(college.location.toLowerCase()) ? 2 : 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.college.rating - a.college.rating)
    .slice(0, 3)
    .map((entry) => entry.college);

  const rankedCertifications = certifications
    .map((course) => ({
      course,
      score: scoreText(
        [course.title, course.provider, course.level, course.description, course.requirements.join(" ")].join(" "),
        tokens
      )
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.course.rating - a.course.rating)
    .slice(0, 3)
    .map((entry) => entry.course);

  const rankedPosts = posts
    .map((post) => ({
      post,
      score: scoreText([post.title, post.excerpt, post.content, post.category].join(" "), tokens)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((entry) => entry.post);

  return buildDynamicFallback(message, {
    colleges: rankedColleges,
    certifications: rankedCertifications,
    posts: rankedPosts
  });
}

interactionsRouter.get("/chat-messages", validateQuery(paginationQuerySchema), async (req, res, next) => {
  try {
    const { page, limit } = paginationQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const where = req.auth?.role === "ADMIN" ? {} : { userId: req.auth?.sub };

    const [items, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      prisma.chatMessage.count({ where })
    ]);

    res.json({ success: true, items, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.post("/chat-messages", validateBody(createChatMessageSchema), async (req, res, next) => {
  try {
    const { role, content } = createChatMessageSchema.parse(req.body);
    const item = await prisma.chatMessage.create({ data: { userId: req.auth!.sub, role, content } });
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.post("/chat", validateBody(chatPromptSchema), async (req, res, next) => {
  try {
    const { message } = chatPromptSchema.parse(req.body);
    const responseText = await getBotResponse(message, req.auth!.sub);

    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.chatMessage.create({ data: { userId: req.auth!.sub, role: "user", content: message } }),
      prisma.chatMessage.create({ data: { userId: req.auth!.sub, role: "assistant", content: responseText } })
    ]);

    res.status(201).json({
      success: true,
      item: assistantMessage,
      history: [userMessage, assistantMessage]
    });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.get("/mock-exam-attempts", validateQuery(paginationQuerySchema), async (req, res, next) => {
  try {
    const { page, limit } = paginationQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const where = req.auth?.role === "ADMIN" ? {} : { userId: req.auth?.sub };

    const [items, total] = await Promise.all([
      prisma.mockExamAttempt.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      prisma.mockExamAttempt.count({ where })
    ]);

    res.json({ success: true, items, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.post("/mock-exam-attempts", validateBody(createMockExamAttemptSchema), async (req, res, next) => {
  try {
    const { examType, difficulty, score, total, correctAnswers, incorrectAnswers, duration } = createMockExamAttemptSchema.parse(req.body);
    const item = await prisma.mockExamAttempt.create({
      data: {
        userId: req.auth!.sub,
        examType,
        difficulty,
        score,
        total,
        correctAnswers,
        incorrectAnswers,
        duration
      }
    });
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.get("/mock-exam-summary", async (req, res, next) => {
  try {
    const attempts = await prisma.mockExamAttempt.findMany({
      where: { userId: req.auth!.sub },
      orderBy: { createdAt: "asc" }
    });

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts
      ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total) * 100, 0) / totalAttempts)
      : 0;
    const latestImprovement = totalAttempts >= 2
      ? Math.round((attempts[totalAttempts - 1].score / attempts[totalAttempts - 1].total) * 100 - (attempts[totalAttempts - 2].score / attempts[totalAttempts - 2].total) * 100)
      : 0;

    const byExam = attempts.reduce<Record<string, number>>((acc, item) => {
      acc[item.examType] = (acc[item.examType] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      item: {
        totalAttempts,
        avgScore,
        latestImprovement,
        byExam,
        attempts
      }
    });
  } catch (error) {
    next(error);
  }
});
