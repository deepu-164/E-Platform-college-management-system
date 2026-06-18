import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, RefreshCcw } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, apiGet, apiPost, type ApiListResponse } from "@/lib/api";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/contexts/AuthContext";

type User = { id: string; createdAt: string };
type Application = { id: string; appliedAt: string; status: string };
type Inquiry = { id: string; status: string };
type Appointment = { id: string; status: string };
type College = { id: string };

type SeoSummary = {
  sitemapUrl: string;
  robotsUrl: string;
  pagesIndexed: { colleges: number; blogPosts: number; certifications: number };
  recommendations: string[];
};

export default function AdminAnalytics() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [collegeCount, setCollegeCount] = useState(0);
  const [seoSummary, setSeoSummary] = useState<SeoSummary | null>(null);
  const [syncingSheets, setSyncingSheets] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [userRes, appRes, inquiryRes, appointmentRes, collegeRes, seoRes] = await Promise.all([
        apiGet<ApiListResponse<User>>("/users", { limit: 5000 }),
        apiGet<ApiListResponse<Application>>("/applications", { limit: 5000 }),
        apiGet<ApiListResponse<Inquiry>>("/inquiries", { limit: 5000 }),
        apiGet<ApiListResponse<Appointment>>("/appointments", { limit: 5000 }),
        apiGet<ApiListResponse<College>>("/colleges", { limit: 1 }),
        apiGet<{ success: boolean; item: SeoSummary }>("/seo/summary")
      ]);
      setUsers(userRes.items);
      setApplications(appRes.items);
      setInquiries(inquiryRes.items);
      setAppointments(appointmentRes.items);
      setCollegeCount(collegeRes.meta?.total ?? collegeRes.items.length);
      setSeoSummary(seoRes.item);
    };

    void load();
  }, []);

  const weeklyApplications = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = new Map<string, number>();
    applications.forEach((item) => {
      const day = days[new Date(item.appliedAt).getDay()];
      map.set(day, (map.get(day) ?? 0) + 1);
    });
    return days.map((day) => ({ name: day, applications: map.get(day) ?? 0 }));
  }, [applications]);

  const statusBreakdown = useMemo(() => {
    const statuses = ["PENDING", "SHORTLISTED", "ACCEPTED", "REJECTED"];
    return statuses.map((status) => ({ status, count: applications.filter((item) => item.status === status).length }));
  }, [applications]);

  const downloadLeadsCsv = async () => {
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/integrations/leads.csv`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "e-platform-leads.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const syncGoogleSheets = async () => {
    setSyncingSheets(true);
    try {
      await apiPost("/integrations/google-sheets/sync", {});
    } finally {
      setSyncingSheets(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track platform activity, application conversion, and indexed content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard title="Users" value={users.length} change="Live" changeType="positive" icon={RefreshCcw} />
        <StatCard title="Colleges" value={collegeCount} change="Indexed" changeType="positive" icon={RefreshCcw} />
        <StatCard title="Applications" value={applications.length} change="Live" changeType="positive" icon={RefreshCcw} />
        <StatCard title="Inquiries" value={inquiries.length} change="Live" changeType="neutral" icon={RefreshCcw} />
        <StatCard title="Appointments" value={appointments.length} change="Live" changeType="neutral" icon={RefreshCcw} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Applications This Week</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyApplications}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="applications" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.16)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Application Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Search and Leads</h2>
        {seoSummary && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground">Indexed colleges</p><p className="mt-2 text-2xl font-bold text-foreground">{seoSummary.pagesIndexed.colleges}</p></div>
            <div className="rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground">Indexed blog posts</p><p className="mt-2 text-2xl font-bold text-foreground">{seoSummary.pagesIndexed.blogPosts}</p></div>
            <div className="rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground">Indexed certifications</p><p className="mt-2 text-2xl font-bold text-foreground">{seoSummary.pagesIndexed.certifications}</p></div>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void downloadLeadsCsv()}><Download className="mr-2 h-4 w-4" />Download Leads CSV</Button>
          <Button onClick={() => void syncGoogleSheets()} disabled={syncingSheets}>{syncingSheets ? "Syncing..." : "Sync Google Sheets"}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
