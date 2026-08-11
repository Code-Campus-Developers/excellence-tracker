import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth, type AuthUser, type AuthStudent } from "@/lib/authStore";
import { useStore } from "@/lib/store";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  return (
    <a
      href={`${API_BASE}/auth/google`}
      className="flex items-center justify-center gap-3 w-full border rounded-lg px-4 py-2.5 text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors"
    >
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {label}
    </a>
  );
}

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login | CodeCampus Excellence Tracker" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const { refresh } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slowMessage, setSlowMessage] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-warm the backend as soon as the page loads
  useEffect(() => {
    const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
    fetch(`${BASE}/health`, { method: "GET" }).catch(() => {/* silent */});
  }, []);

  // Show error toast when redirected back from a failed Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "google_failed") {
      toast.error("Google sign-in failed. Please try again or use email/password.");
      // Clean the URL so the error doesn't re-trigger on refresh
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email or phone number"); return; }
    const isPhone = /^[\d+\s-]{7,}$/.test(email.trim());
    if (!isPhone && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email or phone number"); return; }
    if (!password) { toast.error("Please enter your password"); return; }
    setLoading(true);
    setSlowMessage(false);
    slowTimer.current = setTimeout(() => setSlowMessage(true), 6000);
    try {
      const data = await api.post<{
        token: string;
        user: AuthUser;
        student: AuthStudent | null;
      }>("/auth/login", { email, password });

      login(data.token, data.user, data.student);

      if (data.user.role === "PARENT") {
        toast.error("This login is for students only. Please use the Parent Portal login.");
        logout();
        return;
      }

      if (data.user.role === "ADMIN") navigate({ to: "/admin" });
      else if (data.user.role === "MENTOR") navigate({ to: "/instructor" });
      else navigate({ to: "/student" });
      refresh().catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setSlowMessage(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus International" className="h-20 w-auto" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Google OAuth — above form */}
            <GoogleButton label="Sign in with Google" />
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or sign in with email or phone</span>
              <div className="flex-1 border-t" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Email or Phone Number</Label>
                <Input
                  type="text"
                  placeholder="enter your email or phone number"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : "Sign In"}
              </Button>

              {slowMessage && (
                <div className="mt-3 text-center text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                  ⏳ Server is starting up, please wait a moment...
                </div>
              )}
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              New student?{" "}
              <Link to="/register" className="text-brand font-medium hover:underline">
                Create an account
              </Link>
            </div>

            <div className="mt-4 pt-3 border-t text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-destructive font-medium transition-colors flex items-center justify-center gap-1">
                ← Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
