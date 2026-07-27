import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/instructor")({
  component: MentorLayout,
});

function MentorLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) { navigate({ to: "/instructor-login" }); return; }
      const { user } = JSON.parse(raw) as { user: { role: string } };
      if (user.role !== "MENTOR" && user.role !== "ADMIN") { navigate({ to: "/instructor-login" }); return; }
      setReady(true);
    } catch {
      navigate({ to: "/instructor-login" });
    }
  }, []);
  if (!ready) return null;
  return <Outlet />;
}
