import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Award, ClipboardCheck, ExternalLink, Linkedin, BookOpen, Code2, Calendar, CheckCircle2, Clock, XCircle, Loader2, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarAngleAxis,
  PolarGrid,
} from "recharts";
import { STUDENTS, studentEvals, studentStats, CATEGORIES, MAX_TOTAL } from "@/lib/tracking";
import { useStore } from "@/lib/store";

interface SelfReport {
  id: string;
  weekNumber: number;
  cohortYear: number;
  linkedinDone: boolean; linkedinUrl: string | null;
  learningLogDone: boolean; learningLogUrl: string | null;
  codingDone: boolean; codingUrl: string | null;
  eventDone: boolean; eventUrl: string | null;
  notes: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
}

function SRStatusBadge({ status }: { status: SelfReport["status"] }) {
  if (status === "VERIFIED") return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Verified</Badge>;
  if (status === "REJECTED") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

interface AttendanceRecord {
  id: string;
  date: string;
  clockInAt: string;
  clockOutAt: string | null;
  durationMin: number | null;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
function fmtDur(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const Route = createFileRoute("/instructor/students/$id")({
  head: ({ params }) => {
    return {
      meta: [
        { title: "Student | Performance" },
        { name: "description", content: `Weekly performance history for student ${params.id}.` },
      ],
    };
  },
  loader: ({ params }) => ({ id: params.id }),
  component: StudentDetail,
});

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function StudentDetail() {
  const loaderData = Route.useLoaderData() as { id: string } | undefined;
  const id = loaderData?.id ?? "";
  const { evaluations, students } = useStore();
  const student = students.find((s) => s.id === id);

  const [selfReports, setSelfReports] = useState<SelfReport[]>([]);
  const [srLoading, setSrLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<SelfReport[]>(`/api/self-reports/student/${id}`)
      .then((data) => setSelfReports(data ?? []))
      .catch(() => {/* silent */})
      .finally(() => setSrLoading(false));

    api.get<AttendanceRecord[]>(`/api/attendance/student/${id}`)
      .then((data) => setAttendance(data ?? []))
      .catch(() => {/* silent */})
      .finally(() => setAttendanceLoading(false));
  }, [id]);

  const handleVerify = async (reportId: string, status: "VERIFIED" | "REJECTED") => {
    setVerifying(reportId);
    try {
      const updated = await api.patch<SelfReport>(`/api/self-reports/${reportId}/verify`, { status });
      setSelfReports((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      toast.success(status === "VERIFIED" ? "Report verified!" : "Report rejected");
    } catch {
      toast.error("Failed to update report");
    } finally {
      setVerifying(null);
    }
  };
  if (!student) {
    return (
      <AppShell>
        <div className="p-12 text-center text-muted-foreground">Student not found.</div>
      </AppShell>
    );
  }
  const evals = studentEvals(student.id, evaluations);
  const stats = studentStats(student.id, evaluations);
  const latest = evals[evals.length - 1];

  const trendData = evals.map((e) => ({ week: `W${e.week}`, score: e.total }));
  const radarData = CATEGORIES.map((c) => ({
    category: c.short,
    value: latest ? Math.round((latest.scores[c.key] / c.max) * 100) : 0,
  }));

  const TrendIcon = stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus;
  const trendColor =
    stats.trend > 0 ? "text-[color:var(--success)]" : stats.trend < 0 ? "text-[color:var(--danger)]" : "text-muted-foreground";

  return (
    <AppShell>
      <Link
        to="/instructor/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={student.name} color={student.avatarColor} size={64} />
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-sm text-muted-foreground">
              {student.email} · {student.track} Track
            </p>
            {student.studentCode && (
              <span className="text-xs font-mono bg-brand/10 text-brand px-2 py-0.5 rounded mt-1 inline-block">
                {student.studentCode}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`/student/${student.id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Student View
            </a>
          </Button>
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/instructor/evaluate">
              <ClipboardCheck className="h-4 w-4" />
              New Evaluation
            </Link>
          </Button>
        </div>
      </div>

      {evals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-brand-soft flex items-center justify-center mb-3">
              <ClipboardCheck className="h-6 w-6 text-brand" />
            </div>
            <div className="font-semibold">No evaluations yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              Create the first weekly evaluation for {student.name}.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Latest"
              value={`${latest.total}/100`}
              sub={<PerfBadge total={latest.total} />}
            />
            <StatCard label="Average" value={`${stats.avg}/100`} />
            <StatCard
              label="Highest"
              value={`${stats.high}/100`}
              sub={<span className="inline-flex items-center gap-1 text-brand"><Award className="h-3 w-3" /> best week</span>}
            />
            <StatCard label="Lowest" value={`${stats.low}/100`} />
            <StatCard
              label="Trend"
              value={
                <span className={`inline-flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-5 w-5" />
                  {stats.trend > 0 ? `+${stats.trend}` : stats.trend}
                </span>
              }
              sub={<span className="text-muted-foreground">{stats.count} weeks evaluated</span>}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Score History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="var(--brand)"
                        strokeWidth={3}
                        dot={{ fill: "var(--brand)", r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latest Category Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      />
                      <Radar
                        dataKey="value"
                        stroke="var(--brand)"
                        fill="var(--brand)"
                        fillOpacity={0.35}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Evaluations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {[...evals].reverse().map((e) => (
                  <div key={e.id} className="p-5">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <div className="font-semibold">Week {e.week}</div>
                        <div className="text-xs text-muted-foreground">
                          by {e.evaluator} · {new Date(e.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-brand">{e.total}</div>
                          <div className="text-xs text-muted-foreground">/ {MAX_TOTAL}</div>
                        </div>
                        <PerfBadge total={e.total} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {CATEGORIES.map((c) => {
                        const v = e.scores[c.key];
                        return (
                          <div key={c.key} className="rounded-md border p-2">
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">
                              {c.short}
                            </div>
                            <div className="mt-1 font-semibold text-sm">
                              {v}<span className="text-muted-foreground text-xs">/{c.max}</span>
                            </div>
                            <Progress value={(v / c.max) * 100} className="h-1 mt-1.5" />
                          </div>
                        );
                      })}
                    </div>

                    {e.notes && (
                      <div className="mt-3 text-sm rounded-md bg-muted p-3 border-l-2 border-brand">
                        {e.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── Self-Reports ─── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-brand" />
            Self-Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {srLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : selfReports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No self-reports submitted yet.
            </p>
          ) : (
            <div className="space-y-4">
              {selfReports.map((r) => {
                const done = [
                  r.linkedinDone && "LinkedIn",
                  r.learningLogDone && "Learning Log",
                  r.codingDone && "Coding",
                  r.eventDone && "Event",
                ].filter(Boolean) as string[];
                return (
                  <div key={r.id} className="border rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Week {r.weekNumber}</span>
                        <span className="text-xs text-muted-foreground">{r.cohortYear}</span>
                        <SRStatusBadge status={r.status} />
                      </div>
                      {r.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                            disabled={verifying === r.id}
                            onClick={() => handleVerify(r.id, "VERIFIED")}
                          >
                            {verifying === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            disabled={verifying === r.id}
                            onClick={() => handleVerify(r.id, "REJECTED")}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    {done.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {done.map((d) => (
                          <span key={d} className="text-[10px] font-medium bg-brand-soft text-brand px-2 py-0.5 rounded-full">✓ {d}</span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1 text-xs text-muted-foreground">
                      {r.linkedinDone && r.linkedinUrl && (
                        <a href={r.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate">
                          <Linkedin className="h-3 w-3 shrink-0" /> {r.linkedinUrl}
                        </a>
                      )}
                      {r.learningLogDone && r.learningLogUrl && (
                        <a href={r.learningLogUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate">
                          <BookOpen className="h-3 w-3 shrink-0" /> {r.learningLogUrl}
                        </a>
                      )}
                      {r.codingDone && r.codingUrl && (
                        <a href={r.codingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate">
                          <Code2 className="h-3 w-3 shrink-0" /> {r.codingUrl}
                        </a>
                      )}
                      {r.eventDone && r.eventUrl && (
                        <a href={r.eventUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate">
                          <Calendar className="h-3 w-3 shrink-0" /> {r.eventUrl}
                        </a>
                      )}
                      {r.notes && <p className="mt-1 italic">"{r.notes}"</p>}
                      <p className="mt-1">Submitted {new Date(r.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Attendance ─── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            Attendance
            {attendance.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {attendance.filter((r) => r.durationMin !== null).length} day(s) recorded
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attendanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 px-6">
              No attendance records yet.
            </p>
          ) : (
            <div className="divide-y">
              {attendance.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-3 gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${r.clockOutAt ? "bg-green-500" : "bg-brand animate-pulse"}`} />
                    <div>
                      <p className="text-sm font-medium">{fmtDate(r.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtTime(r.clockInAt)}
                        {r.clockOutAt ? ` – ${fmtTime(r.clockOutAt)}` : " · still in"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-brand shrink-0">
                    {r.durationMin !== null ? fmtDur(r.durationMin) : (
                      <Badge className="bg-brand-soft text-brand border-brand/20 text-[10px]">In progress</Badge>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
