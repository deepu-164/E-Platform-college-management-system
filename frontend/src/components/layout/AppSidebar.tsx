import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Globe,
  GraduationCap,
  Home,
  LogOut,
  MessageCircle,
  School,
  Share2,
  Star,
  TrendingUp,
  UserCircle2,
  Users
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

const studentNav = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "My Profile", icon: UserCircle2, path: "/profile" },
  { title: "Explore Colleges", icon: Building2, path: "/colleges" },
  { title: "Appointments", icon: CalendarDays, path: "/appointments" },
  { title: "KCET Predictor", icon: TrendingUp, path: "/rank-predictor" },
  { title: "Mock Exams", icon: ClipboardList, path: "/mock-exam" },
  { title: "Results", icon: BarChart3, path: "/results" },
  { title: "My Applications", icon: FileText, path: "/applications" },
  { title: "Certifications", icon: Award, path: "/certifications" },
  { title: "Career Guide", icon: Brain, path: "/career" },
  { title: "Blog", icon: BookOpen, path: "/blog" },
  { title: "AI Assistant", icon: MessageCircle, path: "/chatbot" }
];

const adminNav = [
  { title: "Dashboard", icon: Home, path: "/admin" },
  { title: "My Profile", icon: UserCircle2, path: "/admin/profile" },
  { title: "Manage Users", icon: Users, path: "/admin/users" },
  { title: "Manage Colleges", icon: Building2, path: "/admin/colleges" },
  { title: "Manage Courses", icon: Award, path: "/admin/courses" },
  { title: "Manage Exams", icon: ClipboardList, path: "/admin/exams" },
  { title: "View Enquiries", icon: MessageCircle, path: "/admin/inquiries" },
  { title: "SEO Management", icon: Globe, path: "/admin/seo" },
  { title: "Social Media", icon: Share2, path: "/admin/social" },
  { title: "Analytics", icon: BarChart3, path: "/admin/analytics" }
];

const collegeNav = [
  { title: "College Dashboard", icon: School, path: "/college-dashboard" },
  { title: "Enquiries", icon: MessageCircle, path: "/college-enquiries" },
  { title: "Applications", icon: FileText, path: "/college-applications" },
  { title: "Appointments", icon: CalendarDays, path: "/college-appointments" },
  { title: "Reviews", icon: Star, path: "/college-reviews" },
  { title: "College Details", icon: Building2, path: "/college-details" }
];

type NavItemConfig = (typeof studentNav)[number];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const nav = user?.role === "ADMIN" ? adminNav : user?.role === "COLLEGE" ? collegeNav : studentNav;
  const section = user?.role === "ADMIN" ? "Admin" : user?.role === "COLLEGE" ? "College" : "Student";

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const NavItem = ({ item }: { item: NavItemConfig }) => {
    const active = isActive(item.path);

    return (
      <Link
        to={item.path}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
          active ? "bg-primary/12 text-foreground shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
        }`}
      >
        <span className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${active ? "bg-primary" : "bg-transparent"}`} />
        <item.icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-primary" : "text-sidebar-muted group-hover:text-primary"}`} />
        {!collapsed && <span className="truncate text-sm font-medium">{item.title}</span>}
      </Link>
    );
  };

  return (
    <aside className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      <div className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-foreground">E-platform</p>
              <p className="truncate text-xs uppercase tracking-[0.22em] text-sidebar-muted">{user?.name ?? section}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-muted">{section}</p>}
        <div className="space-y-1.5">
          {nav.map((item) => <NavItem key={item.path} item={item} />)}
        </div>
      </nav>

      <div className="space-y-2 border-t border-sidebar-border px-3 py-4">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground">
          <LogOut className="h-4.5 w-4.5 text-sidebar-muted" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="flex w-full items-center justify-center rounded-lg border border-sidebar-border py-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-foreground">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
