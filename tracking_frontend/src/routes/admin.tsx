import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) { navigate({ to: "/admin-login" }); return; }
      const { user } = JSON.parse(raw) as { user: { role: string } };
      if (user.role !== "ADMIN") { navigate({ to: "/admin-login" }); return; }
      setReady(true);
    } catch {
      navigate({ to: "/admin-login" });
    }
  }, []);
  if (!ready) return null;
  return <Outlet />;
}
