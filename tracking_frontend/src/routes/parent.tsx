import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/parent")({
  component: ParentLayout,
});

function ParentLayout() {
  const navigate = useNavigate();
  const authorized = (() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) return false;
      return JSON.parse(raw).user?.role === "PARENT";
    } catch { return false; }
  })();

  useEffect(() => {
    if (!authorized) navigate({ to: "/parent-login", replace: true });
  }, [authorized, navigate]);

  if (!authorized) return null;
  return <Outlet />;
}
