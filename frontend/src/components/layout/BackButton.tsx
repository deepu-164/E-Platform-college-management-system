import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/dashboard") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted/40"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
