import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, CalendarDays } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/attendance-overview")({
  head: () => ({ meta: [{ title: "Attendance Overview | CodeCampus" }] }),
  component: AdminAttendanceOverview,
});

interface AttRecord {
  id: string; date: string; clockInAt: string; clockOutAt: string | null; durationMin: number | null;
  student: { id: string; name: string; track: string; studentCode?: string };
}

function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); }
function fmtDur(min: number) { const h = Math.floor(min / 60), m = min % 60; return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`; }

function AdminAttendanceOverview() {
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AttRecord[]>("/api/attendance/all")
      .then((d) => setRecords(d ?? []))
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, []);

  const today = records.filter((r) => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
  });

  return (
    <AppShell>
      <PageHeader
        title="Attendance Overview"
        subtitle={`All students' attendance · ${today.length} present today`}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : records.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">No attendance records yet.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${r.clockOutAt ? "bg-green-500" : "bg-brand animate-pulse"}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to="/instructor/students/$id" params={{ id: r.student.id }}
                          className="text-sm font-medium hover:text-brand">{r.student.name}</Link>
                        {r.student.studentCode && <span className="text-[10px] font-mono text-brand bg-brand-soft px-1.5 py-0.5 rounded">{r.student.studentCode}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(r.date)} · {fmtTime(r.clockInAt)}{r.clockOutAt ? ` – ${fmtTime(r.clockOutAt)}` : " · still in"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {r.durationMin !== null
                      ? <span className="text-sm font-semibold text-brand">{fmtDur(r.durationMin)}</span>
                      : <Badge className="bg-brand-soft text-brand border-brand/20 text-[10px]">In progress</Badge>}
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
