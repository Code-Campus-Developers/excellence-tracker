import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/authStore";

export const Route = createFileRoute("/parent-register")({
  head: () => ({ meta: [{ title: "Parent Registration | CodeCampus" }] }),
  component: ParentRegister,
});

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

function ParentRegister() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Please enter your full name"); return; }
    if (!form.email.trim()) { toast.error("Please enter your email"); return; }
    if (!form.password) { toast.error("Please enter a password"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(form.password);
    if (!strong) { toast.error("Password must contain uppercase, lowercase, a number, and a symbol"); return; }

    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: AuthUser }>("/auth/register-parent", form);
      login(data.token, data.user);
      toast.success("Account created! Welcome to the Parent Portal.");
      navigate({ to: "/parent" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/image-1785130765553.png" alt="Code Campus International" className="h-20 w-auto" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Create Parent Account</CardTitle>
            <p className="text-sm text-center text-muted-foreground">Monitor your child's progress at Code Campus</p>
          </CardHeader>
          <CardContent>
            {/* Google sign-up */}
            <a
              href={`${API_BASE}/auth/google?role=PARENT`}
              className="flex items-center justify-center gap-3 w-full border rounded-lg px-4 py-2.5 text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </a>

            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or sign up with email</span>
              <div className="flex-1 border-t" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Full Name</Label>
                <Input placeholder="Enter your full name" value={form.name}
                  onChange={(e) => set("name")(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input type="email" placeholder="Enter your email" value={form.email}
                  onChange={(e) => set("email")(e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">Phone Number</Label>
                <Input placeholder="Enter your phone number" value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={form.password}
                    onChange={(e) => set("password")(e.target.value)}
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
                <p className="text-xs text-muted-foreground mt-1">Min 8 chars, uppercase, lowercase, number & symbol</p>
              </div>
              <Button
                type="submit"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={loading}
              >
                {loading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating account…</span> : "Create Account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/parent-login" className="text-brand font-medium hover:underline">Sign in</Link>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-destructive transition-colors">← Back to Home</Link>
            </p>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground">
                After creating your account, contact the Code Campus admin team to link your child's profile to your account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
