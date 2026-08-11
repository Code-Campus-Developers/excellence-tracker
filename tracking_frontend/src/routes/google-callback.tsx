import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, type AuthUser, type AuthStudent } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/google-callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Use window.location.search (raw string) — TanStack Router's location.search
    // is a parsed object in v1, so the fallback never triggered; always use the raw string.
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      toast.error("Google sign-in failed. Please try again.");
      navigate({ to: "/login" });
      return;
    }

    const user: AuthUser = {
      id: params.get("userId") ?? "",
      name: params.get("name") ?? "",
      email: params.get("email") ?? "",
      role: (params.get("role") ?? "STUDENT") as AuthUser["role"],
      track: params.get("track") || null,
      profilePicture: params.get("profilePicture") || null,
      phone: null,
    };

    const studentId = params.get("studentId");
    const student: AuthStudent | null = studentId
      ? {
          id: studentId,
          studentCode: params.get("studentCode") ?? "",
          name: user.name,
          track: params.get("studentTrack") ?? "",
          avatarColor: params.get("studentAvatarColor") ?? "#16a34a",
        }
      : null;

    login(token, user, student);

    const isNewUser = params.get("isNewUser") === "true";

    if (user.role === "ADMIN") navigate({ to: "/admin" });
    else if (user.role === "MENTOR") navigate({ to: "/instructor" });
    else if (user.role === "PARENT" && isNewUser) navigate({ to: "/parent/complete-profile" });
    else if (user.role === "PARENT") navigate({ to: "/parent" });
    else if (isNewUser) navigate({ to: "/student/complete-profile" });
    else navigate({ to: "/student" });
  }, []);

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
        <p className="text-muted-foreground text-sm">Signing you in with Google…</p>
      </div>
    </div>
  );
}
