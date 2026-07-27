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

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register | CodeCampus Excellence Tracker" }] }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { refresh } = useStore();
  const [form, setForm] = useState({ name: "", email: "", password: "", track: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Please enter your full name"); return; }
    if (!form.email.trim()) { toast.error("Please enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Please enter a valid email address"); return; }
    if (!form.track) { toast.error("Please select your track"); return; }
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
      }>("/auth/register", form);
      login(data.token, data.user, data.student);
      await refresh();
      toast.success("Account created! Welcome to Code Campus.");
      navigate({ to: "/student" });
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
          <img src="/image-1785130765553.png" alt="Code Campus" className="h-16 w-auto" style={{ mixBlendMode: "multiply" }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Create your student account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Full Name</Label>
                <Input placeholder="enter your full name" value={form.name}
                  onChange={(e) => set("name")(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
              <Input type="email" placeholder="enter your email" value={form.email}
                  onChange={(e) => set("email")(e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">Track</Label>
                <Select value={form.track} onValueChange={set("track")}>
                  <SelectTrigger><SelectValue placeholder="Select your track" /></SelectTrigger>
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
                  Must contain: uppercase, lowercase, number, and symbol, e.g. <span className="font-mono">Abc@1234</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
