import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2, ArrowLeft, TrendingUp, CalendarCheck, ClipboardList,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParentShell } from "@/components/ParentShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/parent/child/$id")({
  head: () => ({ meta: [{ title: "Child Progress | CodeCampus Parent Portal" }] }),
  component: ChildDetail,
});

interface Evaluation {
  id: string;
  week: number;
  evaluator: string;
  scores: Record<string, number>;
  total: number;
  notes: string;
  createdAt: string;
}

interface AttRecord {
  id: string;
  date: string;
  clockInAt: string;
  clockOutAt: string | null;
  durationMin: number | null;
  notes: string | null;
}

interface Report {
  id: string;
  weekNumber: number;
  cohortYear: number;
  linkedinDone: boolean;
  linkedinUrl: string | null;
  learningLogDone: boolean;
  learningLogUrl: string | null;
  codingDone: boolean;
  codingUrl: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
}

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ScoreBadge({ total }: { total: number }) {
  const color = total >= 80 ? "bg-green-100 text-green-700" : total >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600";
  return <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${color}`}>{total}/100</span>;
}

function StatusBadge({ status }: { status: Report["status"] }) {
  const map = {
    VERIFIED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-600",
    PENDING: "bg-yellow-100 text-yellow-700",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>{status}</span>;
}

function ChildDetail() {
  const { id: studentId } = Route.useParams();
  const [tab, setTab] = useState<"progress" | "attendance" | "reports">("progress");

  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [attendance, setAttendance] = useState<AttRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchers: Promise<unknown>[] = [];

    if (tab === "progress") {
      fetchers.push(
        api.get<Evaluation[]>(`/api/parent/child/${studentId}/evaluations`)
          .then((d) => setEvals(d ?? []))
      );
    } else if (tab === "attendance") {
      fetchers.push(
        api.get<AttRecord[]>(`/api/parent/child/${studentId}/attendance`)
          .then((d) => setAttendance(d ?? []))
      );
    } else {
      fetchers.push(
        api.get<Report[]>(`/api/parent/child/${studentId}/reports`)
          .then((d) => setReports(d ?? []))
      );
    }

    Promise.all(fetchers).finally(() => setLoading(false));
  }, [tab, studentId]);

  const TABS = [
    { key: "progress" as const, label: "Progress", icon: TrendingUp },
    { key: "attendance" as const, label: "Attendance", icon: CalendarCheck },
    { key: "reports" as const, label: "Reports", icon: ClipboardList },
  ];

  return (
    <ParentShell>
      {/* Back */}
      <Link to="/parent" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4" /> Back to children
      </Link>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Progress Tab ──────────────────────────────────── */}
          {tab === "progress" && (
            <div className="space-y-4">
              {evals.length === 0 ? (
                <Card><CardContent className="py-16 text-center text-muted-foreground">No evaluations yet</CardContent></Card>
              ) : (
                evals.map((e) => {
                  const scores = Object.entries(e.scores as Record<string, number>);
                  return (
                    <Card key={e.id}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Week {e.week}</CardTitle>
                        <ScoreBadge total={e.total} />
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {scores.map(([cat, score]) => (
                          <div key={cat} className="flex items-center gap-2 text-sm">
                            <span className="w-36 text-muted-foreground truncate">{cat}</span>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-brand"
                                style={{ width: `${Math.min(100, (score / 20) * 100)}%` }}
                              />
                            </div>
                            <span className="w-8 text-right font-medium">{score}</span>
                          </div>
                        ))}
                        {e.notes && (
                          <p className="text-xs text-muted-foreground pt-2 border-t">
                            <strong>Notes:</strong> {e.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">Evaluated by {e.evaluator} · {fmtDate(e.createdAt)}</p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ── Attendance Tab ─────────────────────────────────── */}
          {tab === "attendance" && (
            <div className="space-y-3">
              {attendance.length === 0 ? (
                <Card><CardContent className="py-16 text-center text-muted-foreground">No attendance records</CardContent></Card>
              ) : (
                attendance.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{fmtDate(r.date)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          In: {fmt(r.clockInAt)} · Out: {fmt(r.clockOutAt)}
                          {r.durationMin && ` · ${Math.round(r.durationMin / 60)}h ${r.durationMin % 60}m`}
                        </p>
                      </div>
                      {r.clockOutAt ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ── Reports Tab ─────────────────────────────────────── */}
          {tab === "reports" && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <Card><CardContent className="py-16 text-center text-muted-foreground">No self-reports submitted yet</CardContent></Card>
              ) : (
                reports.map((r) => {
                  const tasks = [
                    { label: "LinkedIn Post", done: r.linkedinDone, url: r.linkedinUrl },
                    { label: "Learning Log", done: r.learningLogDone, url: r.learningLogUrl },
                    { label: "Coding Project", done: r.codingDone, url: r.codingUrl },
                  ];
                  return (
                    <Card key={r.id}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Week {r.weekNumber} · {r.cohortYear}</CardTitle>
                        <StatusBadge status={r.status} />
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {tasks.map(({ label, done, url }) => (
                          <div key={label} className="flex items-center gap-2 text-sm">
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className={done ? "" : "text-muted-foreground"}>{label}</span>
                            {done && url && (
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-brand hover:underline ml-auto">View</a>
                            )}
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground pt-1 border-t">Submitted {fmtDate(r.submittedAt)}</p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </ParentShell>
  );
}
