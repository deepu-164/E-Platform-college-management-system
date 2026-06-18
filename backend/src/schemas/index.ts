import {
  ApplicationStatus,
  ApplicationType,
  AppointmentMode,
  AppointmentStatus,
  DocumentStatus,
  InquiryStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(5000).default(20),
  search: z.string().optional()
});

export const collegeQuerySchema = paginationQuerySchema.extend({
  location: z.string().optional(),
  type: z.string().optional(),
  startsWith: z.string().length(1).optional(),
  sortBy: z.enum(["rank", "rating", "name"]).default("rank"),
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});

export const createCollegeSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  type: z.string().min(2),
  rank: z.number().int().positive(),
  rating: z.number().min(0).max(5),
  feesPerYear: z.number().int().positive(),
  description: z.string().min(10),
  admissionRequirements: z.array(z.string().min(2)).min(1).default(["Completed qualifying degree", "Academic transcripts"]),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  established: z.number().int().min(1800).max(3000).optional()
});

export const updateCollegeSchema = createCollegeSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required"
});

export const createCollegeReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000)
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  targetCourse: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional()
});

export const updateProfileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  targetCourse: z.string().optional()
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const adminCreateUserSchema = registerSchema.extend({
  role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  phone: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  targetCourse: z.string().optional(),
  managedCollegeId: z.string().min(1).optional()
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  targetCourse: z.string().optional(),
  managedCollegeId: z.string().min(1).nullable().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional()
});

export const updateApplicationStatusSchema = z.object({
  status: z.nativeEnum(ApplicationStatus)
});

export const createApplicationSchema = z.object({
  type: z.nativeEnum(ApplicationType),
  collegeId: z.string().min(1).optional(),
  certificationCourseId: z.string().min(1).optional(),
  courseName: z.string().min(2).optional(),
  applicantName: z.string().min(2),
  applicantEmail: z.string().email(),
  applicantPhone: z.string().min(10),
  qualification: z.string().min(2),
  scoreOrRank: z.string().optional(),
  statement: z.string().max(2000).optional(),
  requirementsSnapshot: z.array(z.string().min(2)).min(1),
  status: z.nativeEnum(ApplicationStatus).optional()
}).superRefine((value, ctx) => {
  if (value.type === ApplicationType.COLLEGE) {
    if (!value.collegeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "collegeId is required for college applications",
        path: ["collegeId"]
      });
    }

    if (!value.courseName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "courseName is required for college applications",
        path: ["courseName"]
      });
    }
  }

  if (value.type === ApplicationType.CERTIFICATION && !value.certificationCourseId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "certificationCourseId is required for certification applications",
      path: ["certificationCourseId"]
    });
  }
});

export const applicationQuerySchema = paginationQuerySchema.extend({
  userId: z.string().optional(),
  collegeId: z.string().optional(),
  certificationCourseId: z.string().optional(),
  type: z.nativeEnum(ApplicationType).optional(),
  status: z.nativeEnum(ApplicationStatus).optional()
});

export const verifyPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});

export const createInquirySchema = z.object({
  collegeId: z.string().min(1),
  courseName: z.string().min(2),
  message: z.string().min(5),
  status: z.nativeEnum(InquiryStatus).optional()
});

export const updateInquirySchema = z.object({
  status: z.nativeEnum(InquiryStatus)
});

export const inquiryQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(InquiryStatus).optional()
});

export const createAppointmentSchema = z.object({
  collegeId: z.string().min(1),
  scheduledFor: z.coerce.date(),
  mode: z.nativeEnum(AppointmentMode),
  notes: z.string().max(1000).optional()
});

export const appointmentQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(AppointmentStatus).optional(),
  collegeId: z.string().optional()
});

export const updateAppointmentSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  counselorName: z.string().min(2).max(120).optional(),
  meetingLink: z.string().url().optional(),
  notes: z.string().max(1000).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required"
});

export const createBlogPostSchema = z.object({
  title: z.string().min(5),
  excerpt: z.string().min(10),
  content: z.string().min(20),
  author: z.string().min(2),
  category: z.string().min(2),
  readTime: z.string().min(2),
  publishedAt: z.coerce.date().optional()
});

export const createChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1)
});

export const createMockExamAttemptSchema = z.object({
  examType: z.string().min(2),
  difficulty: z.string().min(2),
  score: z.number().int().min(0),
  total: z.number().int().positive(),
  correctAnswers: z.number().int().min(0),
  incorrectAnswers: z.number().int().min(0),
  duration: z.number().int().positive()
});

export const chatPromptSchema = z.object({
  message: z.string().min(1)
});

export const mockQuestionQuerySchema = z.object({
  examType: z.string().optional(),
  difficulty: z.string().optional()
});

export const createOfflineInquirySchema = z.object({
  topic: z.string().min(2),
  preferredMode: z.enum(["call", "email", "chat"]),
  message: z.string().min(5)
});

export const createUserDocumentSchema = z.object({
  applicationId: z.string().optional(),
  title: z.string().min(2),
  documentType: z.string().min(2),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileDataUrl: z.string().min(10)
});

export const updateUserDocumentSchema = z.object({
  status: z.nativeEnum(DocumentStatus),
  adminNotes: z.string().optional()
});

export const seatAllotmentQuerySchema = z.object({
  rank: z.coerce.number().int().positive(),
  category: z.string().default("general"),
  round: z.coerce.number().int().min(1).max(2).default(1)
});
