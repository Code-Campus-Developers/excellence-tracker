import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth, type AuthUser, type AuthStudent } from "@/lib/authStore";
import { useStore } from "@/lib/store";
import { TRACKS } from "@/lib/tracking";

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

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register | CodeCampus Excellence Tracker" }] }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { refresh } = useStore();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", track: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { toast.error("Please enter your first name"); return; }
    if (!form.lastName.trim()) { toast.error("Please enter your last name"); return; }
    if (!form.email.trim()) { toast.error("Please enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Please enter a valid email address"); return; }
    if (!form.track) { toast.error("Please select your track"); return; }
    if (!form.phone.trim()) { toast.error("Please enter your phone number"); return; }
    const phoneValid = /^(\+234|0)[0-9]{9,10}$/.test(form.phone.replace(/\s|-/g, ""));
    if (!phoneValid) { toast.error("Enter a valid phone number (e.g. 08012345678 or +2348012345678)"); return; }
    if (!form.password) { toast.error("Please enter a password"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(form.password);
    if (!strong) { toast.error("Password must contain uppercase, lowercase, a number, and a symbol"); return; }
    setLoading(true);
    try {
      const data = await api.post<{
        token: string;
        user: AuthUser;
        student: AuthStudent;
      }>("/auth/register", { ...form, name: `${form.firstName.trim()} ${form.lastName.trim()}` });
      login(data.token, data.user, data.student);
      toast.success("Account created! Welcome to Code Campus.");
      navigate({ to: "/student" });
      refresh().catch(() => {});
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
          <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus International" className="h-20 w-auto" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Create your student account</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Google OAuth — above form */}
            <GoogleButton label="Sign up with Google" />
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or sign up with email</span>
              <div className="flex-1 border-t" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">First Name</Label>
                <Input placeholder="enter your first name" value={form.firstName}
                  onChange={(e) => set("firstName")(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label className="mb-1.5 block">Last Name</Label>
                <Input placeholder="enter your last name" value={form.lastName}
                  onChange={(e) => set("lastName")(e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
              <Input type="email" placeholder="enter your email" value={form.email}
                  onChange={(e) => set("email")(e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="enter your phone number"
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Course</Label>
                <Select value={form.track} onValueChange={set("track")}>
                  <SelectTrigger><SelectValue placeholder="Select your course" /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="enter your password" value={form.password}
                    onChange={(e) => set("password")(e.target.value)} required className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Must contain: uppercase, lowercase, number, and symbol
                </p>
              </div>
              <Button type="submit"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-brand font-medium hover:underline">Sign in</Link>
            </div>

            <div className="mt-3 text-center">
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
