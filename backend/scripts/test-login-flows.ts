import { PrismaClient } from "@prisma/client";

type LoginResponse = {
  success: boolean;
  token: string;
  item: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "COLLEGE" | "STUDENT";
    status: string;
  };
};

type ApiListResponse<T> = {
  success: boolean;
  items: T[];
  meta?: { total: number; page: number; limit: number };
};

const prisma = new PrismaClient();
const API_BASE = "http://localhost:4000/api";
const DEFAULT_PASSWORD = "Password@123";
const REAL_COLLEGE_EMAIL = "acharya.manager@eduportal.com";
const LABEL = `E2E ${new Date().toISOString().slice(0, 10)}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { token?: string; expectedStatus?: number | number[] }): Promise<T> {
  const { token, expectedStatus = [200, 201], headers, ...rest } = init ?? {};
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {})
    }
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  const allowed = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  if (!allowed.includes(response.status)) {
    throw new Error(`Request ${path} failed with ${response.status}: ${text}`);
  }

  return payload as T;
}

async function login(email: string, password: string) {
  const result = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  assert(result.success, `Login failed for ${email}`);
  return result;
}

async function ensureRealCollegeManager(adminToken: string, collegeId: string) {
  const users = await request<ApiListResponse<{ id: string; email: string }>>("/users?limit=5000", { token: adminToken });
  const existing = users.items.find((user) => user.email === REAL_COLLEGE_EMAIL);

  if (existing) {
    await request(`/users/${existing.id}`, {
      method: "PATCH",
      token: adminToken,
      body: JSON.stringify({ role: "COLLEGE", status: "ACTIVE", managedCollegeId: collegeId }),
      expectedStatus: 200
    });
    return existing.id;
  }

  const created = await request<{ success: boolean; item: { id: string } }>("/users", {
    method: "POST",
    token: adminToken,
    body: JSON.stringify({
      name: "Acharya Admissions",
      email: REAL_COLLEGE_EMAIL,
      password: DEFAULT_PASSWORD,
      role: "COLLEGE",
      status: "ACTIVE",
      managedCollegeId: collegeId
    }),
    expectedStatus: 201
  });

  return created.item.id;
}

async function ensureActivity(studentToken: string, college: { id: string; name: string; admissionRequirements: string[]; courses: { name: string }[] }) {
  const courseName = college.courses[0]?.name ?? "MCA";
  const appointmentDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await request("/inquiries", {
    method: "POST",
    token: studentToken,
    body: JSON.stringify({
      collegeId: college.id,
      courseName,
      message: `${LABEL} inquiry for ${college.name}`
    }),
    expectedStatus: 201
  });

  await request("/applications", {
    method: "POST",
    token: studentToken,
    body: JSON.stringify({
      type: "COLLEGE",
      collegeId: college.id,
      courseName,
      applicantName: "Priya Sharma",
      applicantEmail: "priya@email.com",
      applicantPhone: "9876543210",
      qualification: "BCA",
      scoreOrRank: "PGCET Rank 412",
      statement: `${LABEL} application for ${college.name}`,
      requirementsSnapshot: college.admissionRequirements.length ? college.admissionRequirements : ["Academic transcripts"],
      status: "PENDING"
    }),
    expectedStatus: 201
  });

  await request("/appointments", {
    method: "POST",
    token: studentToken,
    body: JSON.stringify({
      collegeId: college.id,
      scheduledFor: appointmentDate,
      mode: "VIDEO",
      notes: `${LABEL} appointment for ${college.name}`
    }),
    expectedStatus: 201
  });

  await request(`/colleges/${college.id}/reviews`, {
    method: "POST",
    token: studentToken,
    body: JSON.stringify({
      rating: 4,
      comment: `${LABEL} review for ${college.name} with realistic linked college data.`
    }),
    expectedStatus: 201
  });
}

async function main() {
  const targetCollege = await prisma.college.findFirst({
    where: {
      name: { not: "R. V. College of Engineering" }
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      location: true,
      admissionRequirements: true,
      courses: { select: { name: true }, take: 3 }
    }
  });

  assert(targetCollege, "No imported college found for real college-account verification");

  const admin = await login("admin@eduportal.com", DEFAULT_PASSWORD);
  assert(admin.item.role === "ADMIN", "Admin login returned wrong role");

  const collegeUserId = await ensureRealCollegeManager(admin.token, targetCollege.id);

  const student = await login("priya@email.com", DEFAULT_PASSWORD);
  assert(student.item.role === "STUDENT", "Student login returned wrong role");

  await ensureActivity(student.token, targetCollege);

  const college = await login(REAL_COLLEGE_EMAIL, DEFAULT_PASSWORD);
  assert(college.item.role === "COLLEGE", "College login returned wrong role");

  const adminMe = await request<{ success: boolean; item: { role: string } }>("/auth/me", { token: admin.token });
  const studentMe = await request<{ success: boolean; item: { role: string } }>("/auth/me", { token: student.token });
  const collegeMe = await request<{ success: boolean; item: { role: string } }>("/auth/me", { token: college.token });

  assert(adminMe.item.role === "ADMIN", "Admin /auth/me mismatch");
  assert(studentMe.item.role === "STUDENT", "Student /auth/me mismatch");
  assert(collegeMe.item.role === "COLLEGE", "College /auth/me mismatch");

  await request("/users?limit=1", { token: admin.token, expectedStatus: 200 });
  await request("/users?limit=1", { token: student.token, expectedStatus: 403 });
  await request("/users?limit=1", { token: college.token, expectedStatus: 403 });

  await request("/college-dashboard/me", { token: student.token, expectedStatus: 403 });
  await request("/college-dashboard/me", { token: admin.token, expectedStatus: 403 });

  const dashboard = await request<{
    success: boolean;
    item: {
      manager: { email: string };
      college: { id: string; name: string; location: string };
      stats: { inquiries: number; applications: number; appointments: number; reviews: number };
      inquiries: Array<{ message: string }>;
      applications: Array<{ statement?: string | null; applicantEmail: string }>;
      appointments: Array<{ notes?: string | null }>;
      reviews: Array<{ comment: string; user: { name: string } }>;
    };
  }>("/college-dashboard/me", { token: college.token, expectedStatus: 200 });

  assert(dashboard.item.manager.email === REAL_COLLEGE_EMAIL, "College dashboard returned the wrong manager account");
  assert(dashboard.item.college.id === targetCollege.id, "College dashboard returned the wrong linked college");
  assert(dashboard.item.stats.inquiries > 0, "College dashboard inquiries count is empty");
  assert(dashboard.item.stats.applications > 0, "College dashboard applications count is empty");
  assert(dashboard.item.stats.appointments > 0, "College dashboard appointments count is empty");
  assert(dashboard.item.stats.reviews > 0, "College dashboard reviews count is empty");
  assert(dashboard.item.inquiries.some((item) => item.message.includes(LABEL)), "Expected inquiry not found in college dashboard");
  assert(dashboard.item.applications.some((item) => (item.statement ?? "").includes(LABEL) && item.applicantEmail === "priya@email.com"), "Expected application not found in college dashboard");
  assert(dashboard.item.appointments.some((item) => (item.notes ?? "").includes(LABEL)), "Expected appointment not found in college dashboard");
  assert(dashboard.item.reviews.some((item) => item.comment.includes(LABEL) && item.user.name === "Priya Sharma"), "Expected review not found in college dashboard");

  console.log(JSON.stringify({
    ok: true,
    testedAt: new Date().toISOString(),
    admin: admin.item.email,
    student: student.item.email,
    college: {
      userId: collegeUserId,
      email: college.item.email,
      linkedCollege: targetCollege.name,
      location: targetCollege.location
    },
    dashboardStats: dashboard.item.stats
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



