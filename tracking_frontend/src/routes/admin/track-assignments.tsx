import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Clock, Loader2, ChevronDown } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { TRACKS } from "@/lib/tracking";

export const Route = createFileRoute("/admin/track-assignments")({
  head: () => ({ meta: [{ title: "Course Assignments | CodeCampus" }] }),
  component: TrackAssignmentsPage,
});

interface Instructor { id: string; name: string; email: string; track: string | null; }
interface AssignmentStudent { id: string; name: string; email: string; track: string; }
interface Assignment {
  id: string; track: string; courseTrack: string | null; startDate: string; endDate: string | null; notes: string | null;
  instructor: Instructor;
  studentIds: string[];
}

const COURSE_TRACKS = [
  "HTML/CSS",
  "JavaScript",
  "Python",
  "React.Js/Next.Js",
  "Node.Js",
  "Agentic Software Engineering",
] as const;

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
  const [students, setStudents] = useState<AssignmentStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    instructorId: "", track: "", courseTrack: "", startDate: "", endDate: "", notes: "",
    studentIds: [] as string[],
  });

  useEffect(() => {
    Promise.all([
      api.get<Assignment[]>("/admin/track-assignments"),
      api.get<Instructor[]>("/admin/instructors"),
      api.get<AssignmentStudent[]>("/api/students"),
    ]).then(([a, i, s]) => { setAssignments(a ?? []); setInstructors(i ?? []); setStudents(s ?? []); })
      .catch(() => { setLoadError(true); toast.error("Unable to load assignments and students. Please refresh to try again."); })
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm({ instructorId: "", track: "", courseTrack: "", startDate: "", endDate: "", notes: "", studentIds: [] });
    setStudentSearch("");
    setStudentPickerOpen(false);
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (a: Assignment) => {
    setForm({
      instructorId: a.instructor.id,
      track: a.track,
      courseTrack: a.courseTrack ?? "",
      startDate: a.startDate.slice(0, 10),
      endDate: a.endDate ? a.endDate.slice(0, 10) : "",
      notes: a.notes ?? "",
      studentIds: a.studentIds ?? [],
    });
    setStudentSearch("");
    setStudentPickerOpen(false);
    setEditId(a.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.instructorId || !form.track || !form.courseTrack || !form.startDate) {
      toast.error("Instructor, course, track, and start date are required"); return;
    }
    setSaving(true);
    try {
      const payload = {
        instructorId: form.instructorId,
        track: form.track,
        courseTrack: form.courseTrack,
        startDate: form.startDate,
        endDate: form.endDate || null,
        notes: form.notes || null,
        studentIds: form.studentIds,
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

  const courseStudents = students.filter((student) => student.track === form.track);
  // Keep previously selected students visible if they were archived or changed course.
  const selectableStudents = [
    ...courseStudents,
    ...form.studentIds.filter((id) => !courseStudents.some((student) => student.id === id))
      .map((id) => students.find((student) => student.id === id) ?? { id, name: "Unavailable student", email: id, track: "" }),
  ];
  const search = studentSearch.trim().toLowerCase();
  const visibleStudents = selectableStudents.filter((student) => `${student.name} ${student.email}`.toLowerCase().includes(search));
  const toggleStudent = (id: string) => setForm((previous) => ({
    ...previous,
    studentIds: previous.studentIds.includes(id)
      ? previous.studentIds.filter((studentId) => studentId !== id)
      : [...previous.studentIds, id],
  }));

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
        title="Course Assignments"
        subtitle="Assign instructors to courses with date ranges. The currently active assignment is used for messaging and notifications."
        actions={
          <Button disabled={loading || loadError} onClick={() => { resetForm(); setShowForm(true); }}
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
                <Label className="mb-1.5 block">Course</Label>
                <Select value={form.track} onValueChange={(v) => { setForm((p) => ({ ...p, track: v, studentIds: [] })); setStudentSearch(""); setStudentPickerOpen(false); }}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>{TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Track</Label>
                <Select value={form.courseTrack} onValueChange={(v) => setForm((p) => ({ ...p, courseTrack: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                  <SelectContent>{COURSE_TRACKS.map((track) => <SelectItem key={track} value={track}>{track}</SelectItem>)}</SelectContent>
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
              <div className="min-w-0">
                <Label htmlFor="assignment-students" className="mb-1.5 block">Students <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Popover open={studentPickerOpen} onOpenChange={(open) => { setStudentPickerOpen(open); if (!open) setStudentSearch(""); }}>
                  <PopoverTrigger asChild>
                    <button
                      id="assignment-students"
                      type="button"
                      disabled={!form.track || saving}
                      aria-describedby="assignment-students-help"
                      className="flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className={`truncate ${form.studentIds.length ? "" : "text-muted-foreground"}`}>
                        {!form.track ? "Select a course first" : form.studentIds.length === 1
                          ? selectableStudents.find((student) => student.id === form.studentIds[0])?.name ?? "1 student selected"
                          : form.studentIds.length > 1 ? `${form.studentIds.length} students selected` : "Select students"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" aria-label="Select students" className="w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-2 space-y-2">
                    <Input aria-label="Search students" placeholder="Search students by name or email" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{form.studentIds.length ? `${form.studentIds.length} student(s) selected` : "All students in this course"}</span>
                      {form.studentIds.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, studentIds: [] }))}>Clear selection</Button>}
                    </div>
                    <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
                      {visibleStudents.length === 0 ? <p className="p-3 text-sm text-muted-foreground">{courseStudents.length === 0 ? "No students in this course yet." : "No students match your search."}</p> : visibleStudents.map((student) => (
                        <label key={student.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                          <input type="checkbox" className="h-4 w-4 accent-green-700" checked={form.studentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{student.name}</span>
                            <span className="block text-xs text-muted-foreground break-all">{student.email}</span>
                            {student.track !== form.track && <span className="block text-xs text-destructive">No longer available in this course. Remove this selection before saving.</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end border-t pt-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => { setStudentPickerOpen(false); setStudentSearch(""); }}>Done</Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <p id="assignment-students-help" className="mt-1.5 text-xs text-muted-foreground">Leave empty for all students in the course.</p>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Notes (optional)</Label>
                <Input placeholder="e.g. Month 1 - Basics" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90" disabled={saving || loading || loadError}>
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
      ) : loadError ? (
        <p className="py-8 text-center text-destructive">Unable to load assignments. Refresh this page to try again.</p>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No course assignments yet. Create one to get started.
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
                            {a.courseTrack && <span className="ml-2 font-medium text-brand">· {a.courseTrack}</span>}
                            {a.notes && <span className="ml-2 italic">· {a.notes}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {a.studentIds?.length
                              ? `Selected students (${a.studentIds.length}): ${a.studentIds.map((id) => students.find((student) => student.id === id)?.name ?? "Unavailable student").join(", ")}`
                              : "All students in this course"}
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
