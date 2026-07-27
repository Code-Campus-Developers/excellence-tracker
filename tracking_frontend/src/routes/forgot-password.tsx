import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password | CodeCampus" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email address"); return; }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setSent(true); // Always show success to prevent user enumeration
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/image-1785130765553.png" alt="Code Campus" className="h-16 w-auto" style={{ mixBlendMode: "multiply" }} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-4 space-y-3">
                <div className="text-4xl">📧</div>
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  If <strong>{email}</strong> is registered, a reset link has been sent.
                </p>
                <Link to="/login" className="text-brand text-sm hover:underline block mt-4">
                  Back to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">Email address</Label>
                  <Input type="email" placeholder="enter your email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
                <Button type="submit"
                  className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <div className="text-center">
                  <Link to="/login" className="text-sm text-muted-foreground hover:underline">
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
