import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth, type AuthUser, type AuthStudent } from "@/lib/authStore";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin-login")({
  head: () => ({ meta: [{ title: "Admin Login — CodeCampus" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { refresh } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email address"); return; }
    if (!password) { toast.error("Please enter your password"); return; }
    setLoading(true);
    try {
      const data = await api.post<{
        token: string;
        user: AuthUser;
        student: AuthStudent | null;
      }>("/auth/login", { email, password });

      if (data.user.role !== "ADMIN") {
        toast.error("Access denied. This login is for administrators only.");
        return;
      }

      login(data.token, data.user, data.student);
      await refresh();
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/image-1784557444135.png" alt="Code Campus" className="h-10 w-auto" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Admin Login</CardTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Sign in to access the admin panel
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input type="email" placeholder="enter your email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label className="mb-1.5 block">Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="enter your password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
