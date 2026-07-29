import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { TRACKS } from "@/lib/tracking";

export const Route = createFileRoute("/admin/track-assignments")({
  head: () => ({ meta: [{ title: "Track Assignments | CodeCampus" }] }),
  component: TrackAssignmentsPage,
});

interface Instructor { id: string; name: string; email: string; track: string | null; }
interface Assignment {
  id: string; track: string; startDate: string; endDate: string | null; notes: string | null;
  instructor: Instructor;
}

function isActive(a: Assignment) {
  const now = new Date();
  const start = new Date(a.startDate);
  if (start > now) return false;
  if (a.endDate && new Date(a.endDate) < now) return false;
  return true;
}

function TrackAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    instructorId: "", track: "", startDate: "", endDate: "", notes: "",
  });

  useEffect(() => {
    Promise.all([
      api.get<Assignment[]>("/admin/track-assignments"),
      api.get<Instructor[]>("/admin/instructors"),
    ]).then(([a, i]) => { setAssignments(a ?? []); setInstructors(i ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm({ instructorId: "", track: "", startDate: "", endDate: "", notes: "" });
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (a: Assignment) => {
    setForm({
      instructorId: a.instructor.id,
      track: a.track,
      startDate: a.startDate.slice(0, 10),
      endDate: a.endDate ? a.endDate.slice(0, 10) : "",
      notes: a.notes ?? "",
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.instructorId || !form.track || !form.startDate) {
      toast.error("Instructor, track, and start date are required"); return;
    }
    setSaving(true);
    try {
      const payload = {
        instructorId: form.instructorId,
        track: form.track,
        startDate: form.startDate,
        endDate: form.endDate || null,
        notes: form.notes || null,
      };
      if (editId) {
        const updated = await api.put<Assignment>(`/admin/track-assignments/${editId}`, payload);
        setAssignments((prev) => prev.map((a) => a.id === updated.id ? updated : a));
        toast.success("Assignment updated");
      } else {
        const created = await api.post<Assignment>("/admin/track-assignments", payload);
        setAssignments((prev) => [created, ...prev]);
        toast.success("Assignment created");
      }
      resetForm();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.del(`/admin/track-assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Assignment removed");
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  };

  // Group by track
  const byTrack = TRACKS.map((track) => ({
    track,
    assignments: assignments.filter((a) => a.track === track).sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    ),
  })).filter((g) => g.assignments.length > 0);

  return (
    <AppShell>
      <PageHeader
        title="Track Assignments"
        subtitle="Assign instructors to tracks with date ranges. The currently active assignment is used for messaging and notifications."
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">
            <Plus className="h-4 w-4" /> New Assignment
          </Button>
        }
      />

      {/* Form */}
      {showForm && (
        <Card className="mb-6 border-brand/30">
          <CardHeader>
            <CardTitle className="text-base">{editId ? "Edit Assignment" : "New Assignment"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Instructor</Label>
                <Select value={form.instructorId} onValueChange={(v) => setForm((p) => ({ ...p, instructorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                  <SelectContent>
                    {instructors.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name} ({i.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Track</Label>
                <Select value={form.track} onValueChange={(v) => setForm((p) => ({ ...p, track: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                  <SelectContent>{TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} required />
              </div>
              <div>
                <Label className="mb-1.5 block">End Date <span className="text-muted-foreground text-xs">(leave blank = ongoing)</span></Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Notes (optional)</Label>
                <Input placeholder="e.g. Month 1 - Basics" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editId ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No track assignments yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {byTrack.map(({ track, assignments: trackAssignments }) => (
            <Card key={track}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {track}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {trackAssignments.map((a) => {
                    const active = isActive(a);
                    return (
                      <div key={a.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${active ? "bg-brand-soft" : ""}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{a.instructor.name}</span>
                            {active ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] gap-0.5">
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground text-[10px] gap-0.5">
                                <Clock className="h-3 w-3" /> {new Date(a.startDate) > new Date() ? "Upcoming" : "Ended"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(a.startDate).toLocaleDateString()} →{" "}
                            {a.endDate ? new Date(a.endDate).toLocaleDateString() : "Ongoing"}
                            {a.notes && <span className="ml-2 italic">· {a.notes}</span>}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(a)}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                            disabled={deleting === a.id} onClick={() => handleDelete(a.id)}>
                            {deleting === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
