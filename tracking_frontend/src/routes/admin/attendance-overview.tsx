import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Loader2, CalendarDays, Plus, Pencil, Trash2, RefreshCw, FileDown } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/attendance-overview")({
  head: () => ({ meta: [{ title: "Attendance Overview | CodeCampus" }] }),
  component: AdminAttendanceOverview,
});

interface AttRecord {
  id: string; date: string; clockInAt: string; clockOutAt: string | null; durationMin: number | null;
  student: { id: string; name: string; track: string; studentCode?: string };
}

function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); }
function fmtDur(min: number) { const h = Math.floor(min / 60), m = min % 60; return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`; }

// Convert ISO datetime to local time input value HH:MM
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function AdminAttendanceOverview() {
  const { students } = useStore();
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const [selectedDate, setSelectedDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<AttRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ studentId: "", date: "", clockIn: "", clockOut: "" });

  // Export state
  const [exportMode, setExportMode] = useState<"week" | "month">("week");
  const todayISO = new Date().toISOString();
  // Default to current ISO week (YYYY-Www) and current month (YYYY-MM)
  const [exportWeek, setExportWeek] = useState(() => {
    const d = new Date();
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const dayOfWeek = (d.getDay() + 6) % 7;
    const weekStart = new Date(d); weekStart.setDate(d.getDate() - dayOfWeek);
    const weekNum = Math.ceil(((weekStart.getTime() - jan4.getTime()) / 86400000 + (jan4.getDay() + 6) % 7 + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  });
  const [exportMonth, setExportMonth] = useState(todayISO.slice(0, 7));
  const [exporting, setExporting] = useState(false);

  const getExportRange = () => {
    if (selectedDate) {
      return { from: selectedDate, to: selectedDate };
    }
    if (exportMode === "week") {
      // Parse YYYY-Www → Monday and Friday of that week
      const [year, week] = exportWeek.split("-W").map(Number);
      const jan4 = new Date(year, 0, 4);
      const weekStart = new Date(jan4);
      weekStart.setDate(jan4.getDate() - (jan4.getDay() + 6) % 7 + (week - 1) * 7);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 4); // Friday
      return {
        from: weekStart.toISOString().slice(0, 10),
        to: weekEnd.toISOString().slice(0, 10),
      };
    } else {
      const [year, month] = exportMonth.split("-").map(Number);
      const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0);
      return {
        from: firstDay,
        to: lastDay.toISOString().slice(0, 10),
      };
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { from, to } = getExportRange();
      const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
      const token = (() => { try { const r = localStorage.getItem("excellence_auth"); return r ? (JSON.parse(r) as { token: string }).token : null; } catch { return null; } })();
      const res = await fetch(`${BASE}/api/attendance/export?from=${from}&to=${to}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: "Export failed" })) as { error?: string }; throw new Error(e.error ?? "Export failed"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `attendance_${from}_to_${to}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Attendance exported!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Export failed"); }
    finally { setExporting(false); }
  };

  const fetchAll = useCallback(() => {
    api.get<AttRecord[]>("/api/attendance/all")
      .then((d) => setRecords(d ?? []))
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    fetchAll();
    // Auto-refresh every 15 seconds for live QR scan updates
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const today = records.filter((r) => {
    const d = new Date(r.date); const now = new Date();
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
  });
  const displayedRecords = selectedDate
    ? records.filter((r) => r.date.slice(0, 10) === selectedDate)
    : activeTab === "today" ? today : records;
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const openAdd = () => {
    setEditRecord(null);
    setForm({ studentId: "", date: new Date().toISOString().slice(0,10), clockIn: "09:00", clockOut: "" });
    setShowForm(true);
  };

  const openEdit = (r: AttRecord) => {
    setEditRecord(r);
    setForm({
      studentId: r.student.id,
      date: r.date.slice(0,10),
      clockIn: toTimeInput(r.clockInAt),
      clockOut: r.clockOutAt ? toTimeInput(r.clockOutAt) : "",
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clockIn) { toast.error("Clock-in time is required"); return; }
    setSaving(true);
    try {
      const makeISO = (dateStr: string, timeStr: string) => {
        const [h, m] = timeStr.split(":").map(Number);
        const d = new Date(dateStr);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      };
      const clockInAt = makeISO(form.date, form.clockIn);
      const clockOutAt = form.clockOut ? makeISO(form.date, form.clockOut) : null;

      if (editRecord) {
        const updated = await api.put<AttRecord>(`/api/attendance/${editRecord.id}`, { clockInAt, clockOutAt });
        setRecords((prev) => prev.map((r) => r.id === updated.id ? updated : r));
        toast.success("Attendance updated");
      } else {
        if (!form.studentId) { toast.error("Select a student"); setSaving(false); return; }
        const created = await api.post<AttRecord>("/api/attendance/manual", { studentId: form.studentId, date: form.date, clockInAt, clockOutAt });
        setRecords((prev) => [created, ...prev]);
        toast.success("Attendance added");
      }
      setShowForm(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.del(`/api/attendance/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Record removed");
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  };

  return (
    <AppShell>
      <PageHeader
        title="Attendance"
        subtitle={selectedDate
          ? `${displayedRecords.length} attendance record${displayedRecords.length === 1 ? "" : "s"} on ${selectedDateLabel}`
          : activeTab === "today" ? `${today.length} present today` : `All attendance records`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchAll} className="gap-1"><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={openAdd} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">
              <Plus className="h-4 w-4" /> Add Entry
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b">
        <div className="flex gap-1">
          <button onClick={() => { setSelectedDate(""); setActiveTab("today"); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "today" && !selectedDate ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            Today {today.length > 0 && <span className="ml-1 bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{today.length}</span>}
          </button>
          <button onClick={() => { setSelectedDate(""); setActiveTab("all"); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "all" && !selectedDate ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            All Records
          </button>
        </div>
      </div>

      {/* Export to Excel */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><FileDown className="h-4 w-4 text-brand" /> Export Attendance to Excel</p>
          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border w-fit mb-3">
            <button onClick={() => setExportMode("week")} className={`px-4 py-1.5 text-sm font-medium transition-colors ${exportMode === "week" ? "bg-brand text-brand-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>Weekly</button>
            <button onClick={() => setExportMode("month")} className={`px-4 py-1.5 text-sm font-medium transition-colors ${exportMode === "month" ? "bg-brand text-brand-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>Monthly</button>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
            {exportMode === "week" ? (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Select Week</Label>
                <Input type="week" value={exportWeek} onChange={(e) => setExportWeek(e.target.value)} className="h-9 text-sm w-full sm:w-48" />
              </div>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Select Month</Label>
                <Input type="month" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="h-9 text-sm w-full sm:w-44" />
              </div>
            )}
            <div>
              <Label htmlFor="admin-attendance-date" className="text-xs text-muted-foreground mb-1 block">Select Date</Label>
              <Input id="admin-attendance-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 w-full sm:w-44" />
            </div>
            {selectedDate && <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate("")}>Clear</Button>}
            <Button onClick={handleExport} disabled={exporting} size="sm" className="w-full sm:w-auto bg-brand text-brand-foreground hover:bg-brand/90 gap-2">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              {exporting ? "Exporting..." : "Download"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Centered add/edit dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!saving) setShowForm(open); }}>
        <DialogContent className="w-[calc(100%_-_2rem)] max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRecord ? "Edit Attendance" : "Add Manual Attendance"}</DialogTitle>
            <DialogDescription>
              {editRecord ? `Update the attendance times for ${editRecord.student.name}.` : "Add an attendance record for a student."}
            </DialogDescription>
          </DialogHeader>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!editRecord && (
                <div>
                  <Label className="mb-1.5 block text-sm">Student</Label>
                  <Select value={form.studentId} onValueChange={(v) => setForm((p) => ({ ...p, studentId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.track})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="mb-1.5 block text-sm">Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required disabled={!!editRecord} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Clock In</Label>
                <Input type="time" value={form.clockIn} onChange={(e) => setForm((p) => ({ ...p, clockIn: e.target.value }))} required />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Clock Out <span className="text-muted-foreground">(optional)</span></Label>
                <Input type="time" value={form.clockOut} onChange={(e) => setForm((p) => ({ ...p, clockOut: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editRecord ? "Update" : "Add Record"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : displayedRecords.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">No attendance records for this selection.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {displayedRecords.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0 w-full sm:w-auto">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${r.clockOutAt ? "bg-green-500" : "bg-brand animate-pulse"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to="/instructor/students/$id" params={{ id: r.student.id }}
                          className="text-sm font-medium hover:text-brand break-words min-w-0">{r.student.name}</Link>
                        {r.student.studentCode && <span className="shrink-0 whitespace-nowrap text-[10px] font-mono text-brand bg-brand-soft px-1.5 py-0.5 rounded">{r.student.studentCode}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(r.date)} · {fmtTime(r.clockInAt)}{r.clockOutAt ? ` – ${fmtTime(r.clockOutAt)}` : " · still in"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0">
                    {r.durationMin !== null
                      ? <span className="text-sm font-semibold text-brand">{fmtDur(r.durationMin)}</span>
                      : <Badge className="bg-brand-soft text-brand border-brand/20 text-[10px]">In progress</Badge>}
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2" onClick={() => openEdit(r)}>
                      <Pencil className="h-3 w-3" />Edit
                    </Button>
                    <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmation(""); }}>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1 px-2" disabled={deleting === r.id}>
                          {deleting === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Attendance Record?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the attendance record for <strong>{r.student.name}</strong> on <strong>{fmtDate(r.date)}</strong>. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor={`delete-attendance-${r.id}`}>Type <strong>DELETE</strong> to confirm</Label>
                          <Input id={`delete-attendance-${r.id}`} value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="DELETE" autoComplete="off" />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction disabled={deleteConfirmation.trim().toUpperCase() !== "DELETE" || deleting === r.id} className="bg-destructive text-white hover:bg-destructive/90" onClick={() => handleDelete(r.id)}>
                            {deleting === r.id ? "Deleting..." : "Delete Attendance"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
