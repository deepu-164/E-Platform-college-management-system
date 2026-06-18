import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Award, Building2, CheckCircle2, Clock, ExternalLink, FileText, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, type ApiListResponse } from "@/lib/api";

type Application = {
  id: string;
  type: "COLLEGE" | "CERTIFICATION";
  courseName?: string | null;
  status: "PENDING" | "SHORTLISTED" | "ACCEPTED" | "REJECTED";
  appliedAt: string;
  college?: {
    name: string;
  } | null;
  certificationCourse?: {
    title: string;
  } | null;
};

type College = {
  id: string;
};

type LiveUpdate = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: string;
};

type MockSummary = {
  totalAttempts: number;
  avgScore: number;
  latestImprovement: number;
};

const statusStyles: Record<string, string> = {
  ACCEPTED: "bg-success/10 text-success",
  PENDING: "bg-warning/10 text-warning",
  REJECTED: "bg-destructive/10 text-destructive",
  SHORTLISTED: "bg-primary/10 text-primary"
};

const statusLabel: Record<string, string> = {
  ACCEPTED: "Accepted",
  PENDING: "Pending",
  REJECTED: "Rejected",
  SHORTLISTED: "Shortlisted"
};

export default function Dashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [collegeCount, setCollegeCount] = useState(0);
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [mockSummary, setMockSummary] = useState<MockSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      const [appsResponse, collegesResponse, updatesResponse, mockSummaryResponse] = await Promise.all([
        apiGet<ApiListResponse<Application>>("/applications", { limit: 100 }),
        apiGet<ApiListResponse<College>>("/colleges", { limit: 100 }),
        apiGet<{ success: boolean; items: LiveUpdate[] }>("/content/live-updates"),
        apiGet<{ success: boolean; item: MockSummary }>("/interactions/mock-exam-summary")
      ]);

      setApplications(appsResponse.items);
      setCollegeCount(collegesResponse.items.length);
      setUpdates(updatesResponse.items);
      setMockSummary(mockSummaryResponse.item);
    };

    void load();
  }, []);

  const chartByMonth = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const map: Record<string, number> = {};

    applications.forEach((application) => {
      const month = months[new Date(application.appliedAt).getMonth()];
      map[month] = (map[month] ?? 0) + 1;
    });

    return Object.keys(map).map((month) => ({ name: month, applications: map[month] }));
  }, [applications]);

  const pieData = useMemo(() => {
    const counts = {
      ACCEPTED: 0,
      PENDING: 0,
      REJECTED: 0,
      SHORTLISTED: 0
    };

    applications.forEach((application) => {
      counts[application.status] += 1;
    });

    return [
      { name: "Accepted", value: counts.ACCEPTED, color: "hsl(var(--success))" },
      { name: "Pending", value: counts.PENDING, color: "hsl(var(--warning))" },
      { name: "Rejected", value: counts.REJECTED, color: "hsl(var(--destructive))" },
      { name: "Shortlisted", value: counts.SHORTLISTED, color: "hsl(var(--primary))" }
    ];
  }, [applications]);

  const avgAcceptance = applications.length ? Math.round((pieData[0].value / applications.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Welcome back, {user?.name ?? "Student"}</h1>
          <p className="mt-1 text-muted-foreground">Here is your admission journey overview.</p>
        </div>
        <Link to="/results" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          Open results <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Applications" value={applications.length} change="Live data" changeType="positive" icon={FileText} />
        <StatCard title="Colleges Listed" value={collegeCount} change="From backend" changeType="positive" icon={Building2} />
        <StatCard title="Mock Tests" value={mockSummary?.totalAttempts ?? 0} change={`${mockSummary?.avgScore ?? 0}% average`} changeType="neutral" icon={Award} iconColor="gradient-accent" />
        <StatCard title="Acceptance Rate" value={`${avgAcceptance}%`} change="From applications" changeType="positive" icon={TrendingUp} iconColor="gradient-accent" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold text-foreground">Application Trends</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Bar dataKey="applications" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold text-foreground">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-2">
            {pieData.map((data) => (
              <div key={data.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.color }} />
                  <span className="text-muted-foreground">{data.name}</span>
                </div>
                <span className="font-medium text-foreground">{data.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold text-foreground">Recent Applications</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">College</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 6).map((application) => (
                  <tr key={application.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{application.college?.name ?? application.certificationCourse?.title ?? "Application"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{application.courseName ?? application.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[application.status]}`}>
                        {application.status === "ACCEPTED" && <CheckCircle2 className="h-3 w-3" />}
                        {application.status === "PENDING" && <Clock className="h-3 w-3" />}
                        {application.status === "REJECTED" && <AlertCircle className="h-3 w-3" />}
                        {statusLabel[application.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(application.appliedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold text-foreground">Practice Snapshot</h3>
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Total mock attempts</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{mockSummary?.totalAttempts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Average mock score</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{mockSummary?.avgScore ?? 0}%</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Latest improvement</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{mockSummary ? `${mockSummary.latestImprovement >= 0 ? "+" : ""}${mockSummary.latestImprovement}%` : "0%"}</p>
            </div>
            <Link to="/results" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              View full results history <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-display font-semibold text-foreground">Live CET and Admission Updates</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {updates.map((update) => (
            <a key={update.id} href={update.url} target="_blank" rel="noreferrer" className="rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{update.category}</span>
                <span className="text-xs text-muted-foreground">{update.source}</span>
              </div>
              <p className="mt-3 font-medium text-foreground">{update.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{update.summary}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Open source <ExternalLink className="h-4 w-4" /></span>
            </a>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
