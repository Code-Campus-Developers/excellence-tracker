import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { UserPlus, Trash2, RefreshCw } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";
import { TRACKS } from "@/lib/tracking";

export const Route = createFileRoute("/mentor/mentors")({
  head: () => ({ meta: [{ title: "Mentors — CodeCampus Excellence Tracker" }] }),
  component: MentorsList,
});

interface MentorRow {
  id: string;
  name: string;
  email: string;
  track?: string | null;
  createdAt: string;
}

function MentorsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", track: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = isAdmin
        ? await api.get<MentorRow[]>("/admin/mentors")
        : await api.get<MentorRow[]>("/api/mentors");
      setMentors(data);
    } catch (err) {
      toast.error("Failed to load mentors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Please enter the mentor's full name"); return; }
    if (!form.email.trim()) { toast.error("Please enter the mentor's email"); return; }
    setSaving(true);
    try {
      await api.post("/admin/mentors", form);
      toast.success(`Mentor created — welcome email sent to ${form.email}`);
      setDialogOpen(false);
      setForm({ name: "", email: "", track: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create mentor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove mentor ${name}?`)) return;
    try {
      await api.del(`/admin/mentors/${id}`);
      toast.success("Mentor removed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    if (!confirm(`Reset password for ${name}? A new password will be emailed to them.`)) return;
    try {
      await api.post(`/admin/users/${id}/reset-password`, {});
      toast.success(`Password reset — new credentials sent to ${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Mentors"
        subtitle={`${mentors.length} mentor${mentors.length !== 1 ? "s" : ""} in the current cohort.`}
        actions={
          isAdmin ? (
            <Button onClick={() => setDialogOpen(true)} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <UserPlus className="h-4 w-4" /> Add Mentor
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="p-0 divide-y">
          {loading && (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading mentors...</div>
          )}
          {!loading && mentors.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No mentors yet.{isAdmin ? " Use \"Add Mentor\" to invite one." : ""}
            </div>
          )}
          {mentors.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email}{m.track ? ` · ${m.track}` : ""}</div>
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                Added {new Date(m.createdAt).toLocaleDateString()}
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleResetPassword(m.id, m.name)}
                    className="text-muted-foreground hover:text-brand p-1"
                    title="Reset password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id, m.name)}
                    className="text-destructive hover:opacity-70 p-1"
                    title="Remove mentor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add New Mentor</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="mb-1.5 block">Full Name</Label>
                <Input placeholder="enter full name" value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input type="email" placeholder="enter email address" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>            <div>
              <Label className="mb-1.5 block">Track / Specialty</Label>
              <Select value={form.track} onValueChange={(v) => setForm((p) => ({ ...p, track: v }))}>
                <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                <SelectContent>
                  {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>              <p className="text-xs text-muted-foreground">
                A welcome email with login credentials will be sent automatically.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}
                className="bg-brand text-brand-foreground hover:bg-brand/90">
                <UserPlus className="h-4 w-4" />
                {saving ? "Creating..." : "Create Mentor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
