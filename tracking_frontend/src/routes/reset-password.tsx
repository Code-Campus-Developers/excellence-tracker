import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password | CodeCampus" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token") ?? ""
    : "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { toast.error("Please enter a new password"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(password);
    if (!strong) { toast.error("Password must contain uppercase, lowercase, a number, and a symbol"); return; }
    if (!confirm) { toast.error("Please confirm your password"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated! Please log in.");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-brand hover:underline mt-2 block">
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus International" className="h-20 w-auto" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Set a new password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">New Password</Label>
                <Input type="password" placeholder="Min. 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label className="mb-1.5 block">Confirm Password</Label>
                <Input type="password" placeholder="Repeat password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
