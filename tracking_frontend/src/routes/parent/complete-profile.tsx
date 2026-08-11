import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/parent/complete-profile")({
  head: () => ({ meta: [{ title: "Complete Your Profile | CodeCampus" }] }),
  component: ParentCompleteProfile,
});

function ParentCompleteProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error("Please enter your phone number"); return; }
    setSaving(true);
    try {
      await api.put("/auth/profile", { phone: phone.trim() });
      updateUser({ phone: phone.trim() });
      toast.success("Profile complete! Welcome to the Parent Portal.");
      navigate({ to: "/parent" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus International" className="h-20 w-auto" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Welcome, {user?.name?.split(" ")[0]}!</CardTitle>
            <p className="text-sm text-center text-muted-foreground">
              You're almost done, just add your phone number to get started.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Phone Number</Label>
                <Input
                  placeholder="enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={saving || !phone.trim()}
              >
                {saving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span> : "Go to My Dashboard →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
