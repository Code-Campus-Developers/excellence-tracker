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

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login | CodeCampus Excellence Tracker" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email address"); return; }
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
      await refresh();

      if (data.user.role === "ADMIN") navigate({ to: "/admin" });
      else if (data.user.role === "MENTOR") navigate({ to: "/instructor" });
      else navigate({ to: "/student" });
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
          <img src="/image-1785130765553.png" alt="Code Campus" className="h-16 w-auto" style={{ mixBlendMode: "multiply" }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  placeholder="enter your email"
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
