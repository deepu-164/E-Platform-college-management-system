import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Building2, FileText, MessageCircle, Users } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { apiGet, type ApiListResponse } from "@/lib/api";

type User = { id: string; createdAt: string };
type Application = { id: string; appliedAt: string; status: string };
type Inquiry = { id: string; status: string };
type Appointment = { id: string };
type College = { id: string };

const priorityActions = [
  { title: "Manage Users", href: "/admin/users", icon: Users, desc: "Create, update, activate, deactivate, and remove accounts." },
  { title: "Manage Colleges", href: "/admin/colleges", icon: Building2, desc: "Maintain the college listings students see across the portal." },
  { title: "View Enquiries", href: "/admin/inquiries", icon: MessageCircle, desc: "Review fresh leads and move them through the admissions pipeline." },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3, desc: "Check conversion, traffic signals, and portal-wide reporting." }
];

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [collegeCount, setCollegeCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [userRes, appRes, inquiryRes, appointmentRes, collegeRes] = await Promise.all([
        apiGet<ApiListResponse<User>>("/users", { limit: 5000 }),
        apiGet<ApiListResponse<Application>>("/applications", { limit: 5000 }),
        apiGet<ApiListResponse<Inquiry>>("/inquiries", { limit: 5000 }),
        apiGet<ApiListResponse<Appointment>>("/appointments", { limit: 5000 }),
        apiGet<ApiListResponse<College>>("/colleges", { limit: 1 })
      ]);

      setUsers(userRes.items);
      setApplications(appRes.items);
      setInquiries(inquiryRes.items);
      setAppointments(appointmentRes.items);
      setCollegeCount(collegeRes.meta?.total ?? collegeRes.items.length);
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

  const pipeline = [
    { stage: "Users", count: users.length },
    { stage: "Inquiries", count: inquiries.length },
    { stage: "Applications", count: applications.length },
    { stage: "Accepted", count: applications.filter((item) => item.status === "ACCEPTED").length }
  ];

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">High-level platform health and the few actions you usually need first.</p>
        </div>
        <Link to="/admin/profile"><Button variant="outline">Admin Profile</Button></Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Users" value={users.length} change="Live" changeType="positive" icon={Users} />
        <StatCard title="Colleges" value={collegeCount} change="Imported" changeType="positive" icon={Building2} />
        <StatCard title="Applications" value={applications.length} change="Live" changeType="positive" icon={FileText} />
        <StatCard title="Inquiries" value={inquiries.length} change="Live" changeType="neutral" icon={MessageCircle} />
        <StatCard title="Appointments" value={appointments.length} change="Live" changeType="neutral" icon={BarChart3} />
      </div>

      <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {priorityActions.map((action) => (
          <Link key={action.href} to={action.href} className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/30">
            <action.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-display text-lg font-semibold text-foreground">{action.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold text-foreground">Applications This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyApplications}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="applications" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.16)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display font-semibold text-foreground">Lead Pipeline</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipeline} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
