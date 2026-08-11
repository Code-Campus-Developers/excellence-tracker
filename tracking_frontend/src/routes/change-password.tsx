import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/change-password")({
  head: () => ({ meta: [{ title: "Change Password | CodeCampus" }] }),
  component: ChangePassword,
});

function ChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auth guard
  useEffect(() => {
    const raw = localStorage.getItem("excellence_auth");
    if (!raw) { navigate({ to: "/login" }); }
  }, []);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const backTo = user?.role === "ADMIN" ? "/admin" : user?.role === "MENTOR" ? "/instructor" : "/student";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current) { toast.error("Please enter your current password"); return; }
    if (!form.newPass) { toast.error("Please enter a new password"); return; }
    if (form.newPass.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(form.newPass);
    if (!strong) { toast.error("Password must contain uppercase, lowercase, a number, and a symbol"); return; }
    if (form.newPass !== form.confirm) { toast.error("Passwords do not match"); return; }
    if (form.current === form.newPass) { toast.error("New password must be different from current password"); return; }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: form.current,
        newPassword: form.newPass,
      });
      toast.success("Password changed successfully");
      setForm({ current: "", newPass: "", confirm: "" });
      setTimeout(() => navigate({ to: backTo }), 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/image-1785130765553.png" alt="Code Campus International" className="h-20 w-auto" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Change Password</CardTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Signed in as <strong>{user?.name}</strong>
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Current Password</Label>
                <div className="relative">
                  <Input type={showCurrent ? "text" : "password"} placeholder="enter current password"
                    value={form.current} onChange={(e) => set("current")(e.target.value)}
                    required className="pr-10" />
                  <button type="button" onClick={() => setShowCurrent((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">New Password</Label>
                <div className="relative">
                  <Input type={showNew ? "text" : "password"} placeholder="enter new password"
                    value={form.newPass} onChange={(e) => set("newPass")(e.target.value)}
                    required className="pr-10" />
                  <button type="button" onClick={() => setShowNew((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Must contain: uppercase, lowercase, number, and symbol, e.g. <span className="font-mono">Abc@1234</span>
                </p>
              </div>
              <div>
                <Label className="mb-1.5 block">Confirm New Password</Label>
                <Input type="password" placeholder="repeat new password"
                  value={form.confirm} onChange={(e) => set("confirm")(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={loading}>
                {loading ? "Changing..." : "Change Password"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
