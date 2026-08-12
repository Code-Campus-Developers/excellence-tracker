import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const authorized = (() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) return false;
      return JSON.parse(raw).user?.role === "ADMIN";
    } catch { return false; }
  })();

  useEffect(() => {
    if (!authorized) navigate({ to: "/admin-login", replace: true });
  }, [authorized, navigate]);

  if (!authorized) return null;
  return <Outlet />;
}
