import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

type RoleRouteProps = {
  allowedRoles: Array<"STUDENT" | "COLLEGE" | "ADMIN">;
};

function getDefaultRoute(role: "STUDENT" | "COLLEGE" | "ADMIN" | undefined): string {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "COLLEGE") {
    return "/college-dashboard";
  }

  return "/dashboard";
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p className="p-8 text-muted-foreground">Checking session...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user?.role)} replace />;
  }

  return <Outlet />;
}
