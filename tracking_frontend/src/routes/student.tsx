import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/student")({
  component: StudentLayout,
});

function StudentLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) { navigate({ to: "/login" }); return; }
      const { user } = JSON.parse(raw) as { user: { role: string } };
      if (user.role !== "STUDENT") { navigate({ to: "/login" }); return; }
      setReady(true);
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  if (!ready) return null;
  return <Outlet />;
}
