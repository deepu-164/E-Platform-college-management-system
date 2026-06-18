import { PrismaClient } from "@prisma/client";

type LoginResponse = {
  success: boolean;
  token: string;
  item: {
    id: string;
    email: string;
    role: "ADMIN" | "COLLEGE" | "STUDENT";
  };
};

type ListResponse<T> = {
  success: boolean;
  items: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};

type ItemResponse<T> = {
  success: boolean;
  item: T;
};

type CollegeSummary = {
  id: string;
  name: string;
  location: string;
  type: string;
  rank: number;
  rating: number;
  feesPerYear: number;
  courses: Array<{ id: string; name: string }>;
};

type CollegeDetail = CollegeSummary & {
  description: string;
  admissionRequirements: string[];
  courses: Array<{ id: string; name: string; duration: string; feesPerYear: number; seats: number }>;
};

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE_URL ?? "http://localhost:4000/api";
const DEFAULT_PASSWORD = "Password@123";
const SMOKE_EMAIL = "smoke.student@eduportal.test";
const SMOKE_PASSWORD = "Password@123";
const LABEL = `SMOKE_217_${new Date().toISOString().slice(0, 10)}`;

const seededExpectations = [
  { email: "priya@email.com", course: "MCA", expectedCollege: "R. V. College of Engineering" },
  { email: "priya@email.com", course: "M.Tech AI & ML", expectedCollege: "PES University" },
  { email: "rahul@email.com", course: "MCA", expectedCollege: "B M S College of Engineering" },
  { email: "rahul@email.com", course: "M.Tech AI", expectedCollege: "M S Ramaiah Institute of Technology" }
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string; expectedStatus?: number | number[] }
): Promise<T> {
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
    throw new Error(`${path} returned ${response.status}: ${text}`);
  }

  return payload as T;
}

async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  assert(response.success, `Login failed for ${email}`);
  return response;
}

async function ensureSmokeStudent(adminToken: string): Promise<LoginResponse> {
  const existing = await prisma.user.findUnique({ where: { email: SMOKE_EMAIL }, select: { id: true } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Student",
      email: SMOKE_EMAIL,
      password: SMOKE_PASSWORD
    })
  });

  await request(`/users/${(await prisma.user.findUniqueOrThrow({ where: { email: SMOKE_EMAIL }, select: { id: true } })).id}`, {
    method: "PATCH",
    token: adminToken,
    body: JSON.stringify({ status: "ACTIVE", role: "STUDENT" })
  });

  return login(SMOKE_EMAIL, SMOKE_PASSWORD);
}

async function verifySeededApplications() {
  const apps = await prisma.application.findMany({
    where: {
      type: "COLLEGE",
      applicantEmail: { in: ["priya@email.com", "rahul@email.com"] }
    },
    include: {
      college: { select: { id: true, name: true, location: true } }
    }
  });

  const checks = seededExpectations.map((expected) => {
    const app = apps.find(
      (item) => item.applicantEmail === expected.email && item.courseName === expected.course
    );

    assert(app, `Missing seeded application for ${expected.email} / ${expected.course}`);
    assert(app.college, `Seeded application has no college: ${expected.email} / ${expected.course}`);
    assert(
      normalize(app.college.name) === normalize(expected.expectedCollege),
      `Application ${expected.email} / ${expected.course} points to ${app.college.name}, expected ${expected.expectedCollege}`
    );

    return {
      applicantEmail: app.applicantEmail,
      courseName: app.courseName,
      college: app.college.name,
      location: app.college.location
    };
  });

  return checks;
}

async function verifyCollegeSearchAndFilters() {
  const all = await request<ListResponse<CollegeSummary>>("/colleges?limit=5000&sortBy=name&sortOrder=asc");
  assert(all.meta?.total === 217, `Expected 217 colleges, got ${all.meta?.total ?? all.items.length}`);
  assert(all.items.length === 217, `Expected 217 college records in response, got ${all.items.length}`);

  const meta = await request<ItemResponse<{
    locations: Array<{ value: string; count: number }>;
    types: Array<{ value: string; count: number }>;
    topCities: Array<{ value: string; count: number }>;
  }>>("/colleges/meta");

  assert(meta.item.locations.length > 0, "College location metadata is empty");
  assert(meta.item.types.length > 0, "College type metadata is empty");

  const topCity = meta.item.topCities[0];
  assert(topCity, "Top city metadata is empty");

  const locationFiltered = await request<ListResponse<CollegeSummary>>(
    `/colleges?limit=5000&location=${encodeURIComponent(topCity.value)}`
  );
  assert(locationFiltered.meta?.total === topCity.count, `Location filter mismatch for ${topCity.value}`);
  assert(locationFiltered.items.every((college) => college.location.toLowerCase() === topCity.value.toLowerCase()), "Location filter returned mixed locations");

  const firstType = meta.item.types[0];
  const typeFiltered = await request<ListResponse<CollegeSummary>>(
    `/colleges?limit=5000&type=${encodeURIComponent(firstType.value)}`
  );
  assert(typeFiltered.items.length > 0, `Type filter returned no colleges for ${firstType.value}`);
  assert(typeFiltered.items.every((college) => college.type.toLowerCase() === firstType.value.toLowerCase()), "Type filter returned mixed types");

  const searchTerm = "Engineering";
  const searched = await request<ListResponse<CollegeSummary>>(`/colleges?limit=5000&search=${searchTerm}`);
  assert((searched.meta?.total ?? 0) > 0, "Search returned no engineering colleges");
  assert(
    searched.items.some((college) => college.name.toLowerCase().includes("engineering") || college.courses.some((course) => course.name.toLowerCase().includes("engineering"))),
    "Search results do not match name or course text"
  );

  const letter = all.items.find((college) => /^[A-Z]/i.test(college.name))?.name[0].toUpperCase() ?? "A";
  const alphabet = await request<ListResponse<CollegeSummary>>(`/colleges?limit=5000&startsWith=${letter}`);
  assert(alphabet.items.length > 0, `A-Z filter returned no colleges for ${letter}`);
  assert(alphabet.items.every((college) => college.name.toUpperCase().startsWith(letter)), "A-Z filter returned mismatched names");

  const detail = await request<ItemResponse<CollegeDetail>>(`/colleges/${all.items[0].id}`);
  assert(detail.item.courses.length > 0, "College detail has no courses");
  assert(detail.item.admissionRequirements.length > 0, "College detail has no admission requirements");

  return {
    total: all.meta?.total ?? all.items.length,
    topCity,
    type: firstType,
    searchMatches: searched.meta?.total ?? searched.items.length,
    alphabet: { letter, matches: alphabet.meta?.total ?? alphabet.items.length },
    detailCollege: detail.item.name
  };
}

async function verifyFormsAndAppointments(studentToken: string) {
  const target = await request<ListResponse<CollegeSummary>>("/colleges?limit=1&sortBy=name&sortOrder=asc");
  const college = target.items[0];
  assert(college, "No college available for form smoke test");
  assert(college.courses[0], `College ${college.name} has no course for application form`);

  const detail = await request<ItemResponse<CollegeDetail>>(`/colleges/${college.id}`);
  const course = detail.item.courses[0];

  const application = await request<ItemResponse<{ id: string; collegeId: string; paymentAmount: number | null }>>("/applications", {
    method: "POST",
    token: studentToken,
    body: JSON.stringify({
      type: "COLLEGE",
      collegeId: detail.item.id,
      courseName: course.name,
      applicantName: "Smoke Student",
      applicantEmail: SMOKE_EMAIL,
      applicantPhone: "9999999999",
      qualification: "BCA",
      scoreOrRank: "KCET Smoke Rank",
      statement: `${LABEL} application form smoke test`,
      requirementsSnapshot: detail.item.admissionRequirements
    })
  });

  assert(application.item.collegeId === detail.item.id, "Application form POST returned the wrong collegeId");
  assert(application.item.paymentAmount === detail.item.feesPerYear, "Application payment amount does not match college fees");

  const appointment = await request<ItemResponse<{ id: string; college: { id: string; name: string }; status: string }>>("/appointments", {
    method: "POST",
    token: studentToken,
    body: JSON.stringify({
      collegeId: detail.item.id,
      scheduledFor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      mode: "VIDEO",
      notes: `${LABEL} appointment smoke test`
    })
  });

  assert(appointment.item.college.id === detail.item.id, "Appointment POST returned the wrong college");
  assert(appointment.item.status === "REQUESTED", "Appointment POST did not default to REQUESTED");

  const appointmentList = await request<ListResponse<{ id: string; college: { id: string } }>>("/appointments?limit=100", {
    token: studentToken
  });
  assert(appointmentList.items.some((item) => item.id === appointment.item.id), "Created appointment is missing from student appointment list");

  const canceled = await request<ItemResponse<{ id: string; status: string }>>(`/appointments/${appointment.item.id}`, {
    method: "PATCH",
    token: studentToken,
    body: JSON.stringify({ status: "CANCELED" })
  });
  assert(canceled.item.status === "CANCELED", "Student appointment cancel did not persist");

  return {
    college: detail.item.name,
    course: course.name,
    applicationId: application.item.id,
    appointmentId: appointment.item.id
  };
}

async function verifyAdminPages(adminToken: string) {
  const users = await request<ListResponse<unknown>>("/users?limit=5", { token: adminToken });
  const colleges = await request<ListResponse<CollegeSummary>>("/colleges?limit=5", { token: adminToken });
  const applications = await request<ListResponse<unknown>>("/applications?limit=5", { token: adminToken });
  const appointments = await request<ListResponse<unknown>>("/appointments?limit=5", { token: adminToken });
  const inquiries = await request<ListResponse<unknown>>("/inquiries?limit=5", { token: adminToken });
  const seo = await request<ItemResponse<unknown>>("/seo/summary", { token: adminToken });
  const social = await request<ItemResponse<unknown>>("/admin-content/site-settings", { token: adminToken });
  const certifications = await request<ListResponse<unknown>>("/admin-content/certifications", { token: adminToken });
  const blogs = await request<ListResponse<unknown>>("/admin-content/blog-posts", { token: adminToken });
  const exams = await request<ListResponse<unknown>>("/admin-content/mock-questions", { token: adminToken });

  assert(users.success && colleges.success && applications.success && appointments.success && inquiries.success, "One or more admin list endpoints failed");
  assert(seo.success && social.success && certifications.success && blogs.success && exams.success, "One or more admin content endpoints failed");

  return {
    users: users.meta?.total ?? users.items.length,
    colleges: colleges.meta?.total ?? colleges.items.length,
    applications: applications.meta?.total ?? applications.items.length,
    appointments: appointments.meta?.total ?? appointments.items.length,
    inquiries: inquiries.meta?.total ?? inquiries.items.length,
    certifications: certifications.items.length,
    blogs: blogs.items.length,
    exams: exams.items.length
  };
}

async function auditContentQuality() {
  const colleges = await prisma.college.findMany({
    include: { courses: true },
    orderBy: { name: "asc" }
  });

  const missingCourses = colleges.filter((college) => college.courses.length === 0);
  const weakDescriptions = colleges.filter((college) => college.description.trim().length < 80);
  const genericDescriptions = colleges.filter((college) => /official kcet engineering college listing|engineering programs listed from/i.test(college.description));
  const verboseNames = colleges.filter((college) => college.name.length > 90);
  const invalidFees = colleges.filter((college) => !Number.isFinite(college.feesPerYear) || college.feesPerYear <= 0);
  const limitedContact = colleges.filter((college) => !college.website && !college.phone && !college.email);
  const invalidCourseFees = colleges.flatMap((college) =>
    college.courses
      .filter((course) => !Number.isFinite(course.feesPerYear) || course.feesPerYear <= 0)
      .map((course) => ({ college: college.name, course: course.name }))
  );

  assert(missingCourses.length === 0, `${missingCourses.length} colleges have no courses`);
  assert(invalidFees.length === 0, `${invalidFees.length} colleges have invalid fees`);
  assert(invalidCourseFees.length === 0, `${invalidCourseFees.length} courses have invalid fees`);

  return {
    total: colleges.length,
    missingCourses: missingCourses.length,
    invalidFees: invalidFees.length,
    invalidCourseFees: invalidCourseFees.length,
    weakDescriptions: weakDescriptions.length,
    genericDescriptions: genericDescriptions.length,
    verboseNames: verboseNames.length,
    limitedContact: limitedContact.length,
    weakDescriptionSamples: weakDescriptions.slice(0, 5).map((college) => college.name),
    verboseNameSamples: verboseNames.slice(0, 5).map((college) => college.name),
    limitedContactSamples: limitedContact.slice(0, 5).map((college) => college.name)
  };
}

async function cleanupSmokeUser() {
  const smokeUser = await prisma.user.findUnique({ where: { email: SMOKE_EMAIL }, select: { id: true } });
  if (smokeUser) {
    await prisma.user.delete({ where: { id: smokeUser.id } });
  }
}

async function main() {
  await request("/health");

  const admin = await login("admin@eduportal.com", DEFAULT_PASSWORD);
  assert(admin.item.role === "ADMIN", "Admin login returned the wrong role");

  const student = await ensureSmokeStudent(admin.token);
  assert(student.item.role === "STUDENT", "Smoke student login returned the wrong role");

  try {
    const seededApplications = await verifySeededApplications();
    const collegeSearchFilters = await verifyCollegeSearchAndFilters();
    const formsAndAppointments = await verifyFormsAndAppointments(student.token);
    const adminPages = await verifyAdminPages(admin.token);
    const contentQuality = await auditContentQuality();

    console.log(JSON.stringify({
      ok: true,
      apiBase: API_BASE,
      checkedAt: new Date().toISOString(),
      seededApplications,
      collegeSearchFilters,
      formsAndAppointments,
      adminPages,
      contentQuality
    }, null, 2));
  } finally {
    await cleanupSmokeUser();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
