import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <p className="p-8 text-muted-foreground">Checking session...</p>;
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === "ADMIN" ? "/admin" : user?.role === "COLLEGE" ? "/college-dashboard" : "/dashboard"} replace />;
  }

  return <Outlet />;
}
