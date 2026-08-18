import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/parent-portal")({
  beforeLoad: () => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("excellence_auth") : null;
      if (raw) {
        const role = (JSON.parse(raw) as { user?: { role?: string } }).user?.role;
        if (role === "PARENT") throw redirect({ to: "/parent" });
      }
    } catch (e) { throw e; }
    throw redirect({ to: "/parent-login" });
  },
  component: () => null,
});
