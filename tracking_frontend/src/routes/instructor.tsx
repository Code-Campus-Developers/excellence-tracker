import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/instructor")({
  component: InstructorLayout,
});

function InstructorLayout() {
  const navigate = useNavigate();
  const authorized = (() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) return false;
      const role = JSON.parse(raw).user?.role;
      return role === "MENTOR" || role === "ADMIN";
    } catch { return false; }
  })();

  useEffect(() => {
    if (!authorized) navigate({ to: "/instructor-login", replace: true });
  }, [authorized, navigate]);

  if (!authorized) return null;
  return <Outlet />;
}
