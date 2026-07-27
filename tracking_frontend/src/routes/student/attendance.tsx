import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { LogIn, LogOut, Clock, CalendarDays, CheckCircle2, Timer, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { StudentShell } from "@/components/StudentShell";

export const Route = createFileRoute("/student/attendance")({
  head: () => ({ meta: [{ title: "Attendance | CodeCampus" }] }),
  component: StudentAttendance,
});

interface AttendanceRecord { id: string; date: string; clockInAt: string; clockOutAt: string | null; durationMin: number | null; }

function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); }
function fmtDur(min: number) { const h = Math.floor(min / 60), m = min % 60; return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`; }

function useElapsed(clockInAt: string | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!clockInAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(clockInAt).getTime()) / 60_000));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [clockInAt]);
  return elapsed;
}

function TodayCard({ record, onClockIn, onClockOut, loading }: { record: AttendanceRecord | null; onClockIn: () => void; onClockOut: () => void; loading: boolean; }) {
  const elapsed = useElapsed(record && !record.clockOutAt ? record.clockInAt : null);
  const isIn = !!record && !record.clockOutAt;
  const isDone = !!record && !!record.clockOutAt;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-green-100 text-green-600" : isIn ? "bg-brand-soft text-brand animate-pulse" : "bg-muted text-muted-foreground"}`}>
              {isDone ? <CheckCircle2 className="h-7 w-7" /> : isIn ? <Timer className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
            </div>
            <div>
              <p className="text-lg font-bold">{isDone ? "Attendance Complete" : isIn ? "Currently Clocked In" : "Not Yet Clocked In"}</p>
              <p className="text-sm text-muted-foreground">
                {isDone ? `${fmtTime(record!.clockInAt)} – ${fmtTime(record!.clockOutAt!)} · ${fmtDur(record!.durationMin!)}`
                  : isIn ? `Since ${fmtTime(record!.clockInAt)} · ${fmtDur(elapsed)} elapsed`
                  : new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!record && <Button onClick={onClockIn} disabled={loading} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}Clock In</Button>}
            {isIn && <Button onClick={onClockOut} disabled={loading} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}Clock Out</Button>}
            {isDone && <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1.5"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Done for today</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentAttendance() {
  const [today, setToday] = useState<AttendanceRecord | null | undefined>(undefined);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchToday = useCallback(async () => { try { setToday(await api.get<AttendanceRecord | null>("/api/attendance/today")); } catch { setToday(null); } }, []);
  const fetchHistory = useCallback(async () => { try { setHistory((await api.get<AttendanceRecord[]>("/api/attendance/me")) ?? []); } catch {/* */} finally { setHistoryLoading(false); } }, []);

  useEffect(() => { fetchToday(); fetchHistory(); }, [fetchToday, fetchHistory]);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const record = await api.post<AttendanceRecord>("/api/attendance/clock-in", {});
      setToday(record); setHistory((prev) => [record, ...prev]);
      toast.success("Clocked in! Have a great session.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const record = await api.post<AttendanceRecord>("/api/attendance/clock-out", {});
      setToday(record); setHistory((prev) => prev.map((r) => r.id === record.id ? record : r));
      toast.success(`Clocked out! ${fmtDur(record.durationMin ?? 0)} session.`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setActionLoading(false); }
  };

  const completed = history.filter((r) => r.durationMin !== null);
  const totalMin = completed.reduce((s, r) => s + (r.durationMin ?? 0), 0);
  const avgMin = completed.length ? Math.round(totalMin / completed.length) : 0;

  return (
    <StudentShell title="Attendance">
      <div className="max-w-2xl space-y-6">
        {today === undefined ? (
          <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
        ) : (
          <TodayCard record={today} onClockIn={handleClockIn} onClockOut={handleClockOut} loading={actionLoading} />
        )}

        {completed.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[{ label: "Days Present", value: completed.length, icon: <CalendarDays className="h-4 w-4 text-brand" /> }, { label: "Total Time", value: fmtDur(totalMin), icon: <Clock className="h-4 w-4 text-brand" /> }, { label: "Avg / Day", value: fmtDur(avgMin), icon: <TrendingUp className="h-4 w-4 text-brand" /> }].map((s) => (
              <Card key={s.label}><CardContent className="p-4 text-center"><div className="flex items-center justify-center mb-1">{s.icon}</div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand" />Attendance History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : history.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">No records yet. Clock in to start tracking!</p>
            ) : (
              <div className="divide-y">
                {history.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-6 py-3 gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${r.clockOutAt ? "bg-green-500" : "bg-brand animate-pulse"}`} />
                      <div>
                        <p className="text-sm font-medium">{fmtDate(r.date)}</p>
                        <p className="text-xs text-muted-foreground">{fmtTime(r.clockInAt)}{r.clockOutAt ? ` – ${fmtTime(r.clockOutAt)}` : " · still in"}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {r.durationMin !== null ? <span className="text-sm font-semibold text-brand">{fmtDur(r.durationMin)}</span> : <Badge className="bg-brand-soft text-brand border-brand/20 text-[10px]">In progress</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
