import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, FileText, MessageCircle, Pencil, Star } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { apiGet, apiPatch } from "@/lib/api";

type CollegeWorkspaceView = "dashboard" | "inquiries" | "applications" | "appointments" | "reviews" | "details";

type College = {
  id: string;
  name: string;
  location: string;
  type: string;
  rank: number;
  rating: number;
  feesPerYear: number;
  description: string;
  admissionRequirements: string[];
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  established?: number | null;
  courses?: Array<{ id: string; name: string; duration: string; feesPerYear: number; seats: number }>;
};

type DashboardData = {
  manager: { id: string; name: string; email: string };
  college: College;
  stats: { inquiries: number; applications: number; appointments: number; reviews: number };
  inquiries: Array<{ id: string; courseName: string; message?: string; status: string; createdAt: string; user: { name: string; email: string } }>;
  applications: Array<{
    id: string;
    courseName?: string | null;
    status: string;
    appliedAt: string;
    applicantName?: string;
    applicantEmail?: string;
    applicantPhone?: string;
    qualification?: string;
    scoreOrRank?: string | null;
    statement?: string | null;
    user: { name: string; email: string };
  }>;
  appointments: Array<{
    id: string;
    scheduledFor: string;
    status: string;
    mode: string;
    counselorName?: string | null;
    meetingLink?: string | null;
    notes?: string | null;
    user: { name: string; email: string };
  }>;
  reviews: Array<{ id: string; rating: number; comment: string; createdAt: string; user: { name: string } }>;
};

type CollegeForm = {
  name: string;
  location: string;
  type: string;
  rank: string;
  rating: string;
  feesPerYear: string;
  description: string;
  admissionRequirements: string;
  website: string;
  phone: string;
  email: string;
  established: string;
};

const applicationStatuses = ["PENDING", "SHORTLISTED", "ACCEPTED", "REJECTED"];
const inquiryStatuses = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];
const appointmentStatuses = ["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELED"];

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-5 text-sm text-muted-foreground">{message}</div>;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function toForm(college: College): CollegeForm {
  return {
    name: college.name,
    location: college.location,
    type: college.type,
    rank: String(college.rank),
    rating: String(college.rating),
    feesPerYear: String(college.feesPerYear),
    description: college.description,
    admissionRequirements: college.admissionRequirements.join("\n"),
    website: college.website ?? "",
    phone: college.phone ?? "",
    email: college.email ?? "",
    established: college.established ? String(college.established) : ""
  };
}

function toCollegePayload(form: CollegeForm) {
  return {
    name: form.name,
    location: form.location,
    type: form.type,
    rank: Number(form.rank),
    rating: Number(form.rating),
    feesPerYear: Number(form.feesPerYear),
    description: form.description,
    admissionRequirements: form.admissionRequirements.split("\n").map((item) => item.trim()).filter(Boolean),
    website: form.website || undefined,
    phone: form.phone || undefined,
    email: form.email || undefined,
    established: form.established ? Number(form.established) : undefined
  };
}

export function CollegeWorkspace({ view }: { view: CollegeWorkspaceView }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [form, setForm] = useState<CollegeForm | null>(null);

  const load = async () => {
    try {
      const response = await apiGet<{ success: boolean; item: DashboardData }>("/college-dashboard/me");
      setData(response.item);
      setForm(toForm(response.item.college));
      setError(null);
    } catch {
      setError("Unable to load this college account. Check that the login is linked to a managed college.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const title = useMemo(() => {
    if (view === "inquiries") return "Enquiries";
    if (view === "applications") return "Applications";
    if (view === "appointments") return "Appointments";
    if (view === "reviews") return "Reviews";
    if (view === "details") return "College Details";
    return "College Dashboard";
  }, [view]);

  const updateApplicationStatus = async (id: string, status: string) => {
    setSavingId(id);
    try {
      await apiPatch(`/applications/${id}/status`, { status });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const updateInquiryStatus = async (id: string, status: string) => {
    setSavingId(id);
    try {
      await apiPatch(`/inquiries/${id}`, { status });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    setSavingId(id);
    try {
      await apiPatch(`/appointments/${id}`, { status });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const saveDetails = async () => {
    if (!form) return;
    setSavingDetails(true);
    try {
      await apiPatch("/college-dashboard/me/college", toCollegePayload(form));
      await load();
    } finally {
      setSavingDetails(false);
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">{error}</p>
      </DashboardLayout>
    );
  }

  if (!data || !form) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Loading college workspace...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-muted-foreground">{data.college.name} | Managed by {data.manager.name}</p>
        </div>
        {view === "dashboard" && (
          <Link to="/college-details" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <Pencil className="h-4 w-4" /> Edit College Details
          </Link>
        )}
      </div>

      {view === "dashboard" && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Enquiries" value={data.stats.inquiries} change="Student leads" changeType="positive" icon={MessageCircle} />
            <StatCard title="Applications" value={data.stats.applications} change="Admissions pipeline" changeType="positive" icon={FileText} />
            <StatCard title="Appointments" value={data.stats.appointments} change="Counseling schedule" changeType="neutral" icon={CalendarDays} />
            <StatCard title="Reviews" value={data.stats.reviews} change={`${data.college.rating.toFixed(1)} avg`} changeType="positive" icon={Star} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SummaryCard title="Latest Enquiries" href="/college-enquiries" items={data.inquiries.slice(0, 4).map((item) => `${item.user.name} - ${item.courseName}`)} />
            <SummaryCard title="Recent Applications" href="/college-applications" items={data.applications.slice(0, 4).map((item) => `${item.user.name} - ${item.status}`)} />
            <SummaryCard title="Upcoming Appointments" href="/college-appointments" items={data.appointments.slice(0, 4).map((item) => `${item.user.name} - ${new Date(item.scheduledFor).toLocaleString()}`)} />
            <SummaryCard title="Latest Reviews" href="/college-reviews" items={data.reviews.slice(0, 4).map((item) => `${item.user.name} - ${item.rating}/5`)} />
          </div>
        </>
      )}

      {view === "inquiries" && (
        <Panel title="Student Enquiries">
          {data.inquiries.length ? data.inquiries.map((item) => (
            <RecordCard key={item.id} title={item.user.name} meta={`${item.user.email} | ${new Date(item.createdAt).toLocaleDateString()}`}>
              <p className="text-sm text-foreground">{item.courseName}</p>
              {item.message && <p className="mt-2 text-sm text-muted-foreground">{item.message}</p>}
              <StatusSelect value={item.status} options={inquiryStatuses} disabled={savingId === item.id} onChange={(status) => updateInquiryStatus(item.id, status)} />
            </RecordCard>
          )) : <EmptyState message="No enquiries are available for this college yet." />}
        </Panel>
      )}

      {view === "applications" && (
        <Panel title="Student Applications">
          {data.applications.length ? data.applications.map((item) => (
            <RecordCard key={item.id} title={item.applicantName ?? item.user.name} meta={`${item.applicantEmail ?? item.user.email} | Applied ${new Date(item.appliedAt).toLocaleDateString()}`}>
              <p className="text-sm text-foreground">{item.courseName ?? "College application"}</p>
              {item.qualification && <p className="mt-1 text-sm text-muted-foreground">Qualification: {item.qualification}</p>}
              {item.scoreOrRank && <p className="text-sm text-muted-foreground">Score or rank: {item.scoreOrRank}</p>}
              {item.statement && <p className="mt-2 text-sm text-muted-foreground">{item.statement}</p>}
              <StatusSelect value={item.status} options={applicationStatuses} disabled={savingId === item.id} onChange={(status) => updateApplicationStatus(item.id, status)} />
            </RecordCard>
          )) : <EmptyState message="No applications are linked to this college yet." />}
        </Panel>
      )}

      {view === "appointments" && (
        <Panel title="Counseling Appointments">
          {data.appointments.length ? data.appointments.map((item) => (
            <RecordCard key={item.id} title={item.user.name} meta={`${item.user.email} | ${new Date(item.scheduledFor).toLocaleString()}`}>
              <p className="text-sm text-foreground">Mode: {item.mode.replace("_", " ")}</p>
              {item.counselorName && <p className="text-sm text-muted-foreground">Counselor: {item.counselorName}</p>}
              {item.meetingLink && <p className="text-sm text-muted-foreground">Meeting: {item.meetingLink}</p>}
              {item.notes && <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>}
              <StatusSelect value={item.status} options={appointmentStatuses} disabled={savingId === item.id} onChange={(status) => updateAppointmentStatus(item.id, status)} />
            </RecordCard>
          )) : <EmptyState message="No appointments are scheduled for this college yet." />}
        </Panel>
      )}

      {view === "reviews" && (
        <Panel title="Student Reviews">
          {data.reviews.length ? data.reviews.map((item) => (
            <RecordCard key={item.id} title={item.user.name} meta={`${item.rating}/5 | ${new Date(item.createdAt).toLocaleDateString()}`}>
              <p className="text-sm text-muted-foreground">{item.comment}</p>
            </RecordCard>
          )) : <EmptyState message="No reviews are available for this college yet." />}
        </Panel>
      )}

      {view === "details" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <Panel title="Edit College Details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="College name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <Field label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
              <Field label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value })} />
              <Field label="Rank" value={form.rank} onChange={(value) => setForm({ ...form, rank: value })} />
              <Field label="Rating" value={form.rating} onChange={(value) => setForm({ ...form, rating: value })} />
              <Field label="Fees per year" value={form.feesPerYear} onChange={(value) => setForm({ ...form, feesPerYear: value })} />
              <Field label="Website" value={form.website} onChange={(value) => setForm({ ...form, website: value })} />
              <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="Established" value={form.established} onChange={(value) => setForm({ ...form, established: value })} />
            </div>
            <label className="mt-4 block text-sm font-medium text-foreground">Description</label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
            <label className="mt-4 block text-sm font-medium text-foreground">Admission requirements</label>
            <textarea value={form.admissionRequirements} onChange={(event) => setForm({ ...form, admissionRequirements: event.target.value })} className="mt-2 min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
            <button onClick={() => void saveDetails()} disabled={savingDetails} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {savingDetails ? "Saving..." : "Save College Details"}
            </button>
          </Panel>

          <Panel title="College Snapshot">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Location:</span> {data.college.location}</p>
              <p><span className="font-medium text-foreground">Type:</span> {data.college.type}</p>
              <p><span className="font-medium text-foreground">Rank:</span> {data.college.rank}</p>
              <p><span className="font-medium text-foreground">Rating:</span> {data.college.rating}/5</p>
              <p><span className="font-medium text-foreground">Fees:</span> {formatMoney(data.college.feesPerYear)}</p>
              <div>
                <p className="font-medium text-foreground">Courses</p>
                <div className="mt-2 space-y-2">
                  {data.college.courses?.length ? data.college.courses.map((course) => (
                    <div key={course.id} className="rounded-lg border border-border/60 p-3">
                      <p className="font-medium text-foreground">{course.name}</p>
                      <p>{course.duration} | {course.seats} seats | {formatMoney(course.feesPerYear)}</p>
                    </div>
                  )) : <p>No courses configured yet.</p>}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
}

function SummaryCard({ title, href, items }: { title: string; href: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        <Link to={href} className="text-sm font-medium text-primary">View all</Link>
      </div>
      <div className="space-y-2">
        {items.length ? items.map((item) => <p key={item} className="rounded-lg bg-muted/20 px-3 py-2 text-sm text-muted-foreground">{item}</p>) : <EmptyState message="No records yet." />}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function RecordCard({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      {children}
    </div>
  );
}

function StatusSelect({ value, options, disabled, onChange }: { value: string; options: string[]; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-3 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground disabled:opacity-60">
      {options.map((status) => <option key={status} value={status}>{status}</option>)}
    </select>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
    </label>
  );
}



