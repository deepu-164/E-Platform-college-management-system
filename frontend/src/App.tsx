import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/auth/PublicOnlyRoute";
import { RoleRoute } from "@/components/auth/RoleRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminColleges = lazy(() => import("./pages/AdminColleges"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const AdminExams = lazy(() => import("./pages/AdminExams"));
const AdminInquiries = lazy(() => import("./pages/AdminInquiries"));
const AdminSeo = lazy(() => import("./pages/AdminSeo"));
const AdminSocial = lazy(() => import("./pages/AdminSocial"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Applications = lazy(() => import("./pages/Applications"));
const ApplicationForm = lazy(() => import("./pages/ApplicationForm"));
const ApplicationPayment = lazy(() => import("./pages/ApplicationPayment"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const Career = lazy(() => import("./pages/Career"));
const Certifications = lazy(() => import("./pages/Certifications"));
const Chatbot = lazy(() => import("./pages/Chatbot"));
const CollegeDashboard = lazy(() => import("./pages/CollegeDashboard"));
const CollegeEnquiries = lazy(() => import("./pages/CollegeEnquiries"));
const CollegeApplications = lazy(() => import("./pages/CollegeApplications"));
const CollegeAppointments = lazy(() => import("./pages/CollegeAppointments"));
const CollegeReviews = lazy(() => import("./pages/CollegeReviews"));
const CollegeDetails = lazy(() => import("./pages/CollegeDetails"));
const CollegeDetail = lazy(() => import("./pages/CollegeDetail"));
const Colleges = lazy(() => import("./pages/Colleges"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const MockExam = lazy(() => import("./pages/MockExam"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Profile = lazy(() => import("./pages/Profile"));
const RankPredictor = lazy(() => import("./pages/RankPredictor"));
const Register = lazy(() => import("./pages/Register"));
const Results = lazy(() => import("./pages/Results"));

function RouteFallback() {
  return <p className="p-8 text-muted-foreground">Loading...</p>;
}

function IndexRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <p className="p-8 text-muted-foreground">Checking session...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === "COLLEGE") {
    return <Navigate to="/college-dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<IndexRedirect />} />

              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute allowedRoles={["STUDENT"]} />}>
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/applications/new" element={<ApplicationForm />} />
                  <Route path="/applications/:id/payment" element={<ApplicationPayment />} />
                  <Route path="/colleges" element={<Colleges />} />
                  <Route path="/colleges/:id" element={<CollegeDetail />} />
                  <Route path="/rank-predictor" element={<RankPredictor />} />
                  <Route path="/mock-exam" element={<MockExam />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/chatbot" element={<Chatbot />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:id" element={<BlogDetail />} />
                  <Route path="/career" element={<Career />} />
                  <Route path="/certifications" element={<Certifications />} />
                </Route>

                <Route element={<RoleRoute allowedRoles={["COLLEGE"]} />}>
                  <Route path="/college-dashboard" element={<CollegeDashboard />} />
                  <Route path="/college-enquiries" element={<CollegeEnquiries />} />
                  <Route path="/college-applications" element={<CollegeApplications />} />
                  <Route path="/college-appointments" element={<CollegeAppointments />} />
                  <Route path="/college-reviews" element={<CollegeReviews />} />
                  <Route path="/college-details" element={<CollegeDetails />} />
                </Route>

                <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/admin/profile" element={<Profile />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/colleges" element={<AdminColleges />} />
                  <Route path="/admin/courses" element={<AdminCourses />} />
                  <Route path="/admin/exams" element={<AdminExams />} />
                  <Route path="/admin/inquiries" element={<AdminInquiries />} />
                  <Route path="/admin/seo" element={<AdminSeo />} />
                  <Route path="/admin/social" element={<AdminSocial />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
