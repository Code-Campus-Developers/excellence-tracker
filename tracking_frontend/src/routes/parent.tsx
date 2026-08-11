import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/parent")({
  component: ParentLayout,
});

function ParentLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) { navigate({ to: "/parent-login" }); return; }
      const { user } = JSON.parse(raw) as { user: { role: string } };
      if (user.role !== "PARENT") { navigate({ to: "/parent-login" }); return; }
      setReady(true);
    } catch {
      navigate({ to: "/parent-login" });
    }
  }, [navigate]);

  if (!ready) return null;
  return <Outlet />;
}
