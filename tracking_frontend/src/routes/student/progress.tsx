import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Award, Loader2 as Spin } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, RadarChart, Radar, PolarAngleAxis, PolarGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PerfBadge } from "@/components/PerfBadge";
import { CATEGORIES, MAX_TOTAL, studentStats } from "@/lib/tracking";
import { api } from "@/lib/api";
import { StudentShell } from "@/components/StudentShell";
import { useStore, getCurrentWeek } from "@/lib/store";
import { GradingScale } from "@/components/GradingScale";
import type { Student, Evaluation } from "@/lib/tracking";

export const Route = createFileRoute("/student/progress")({
  head: () => ({ meta: [{ title: "My Progress | CodeCampus" }] }),
  component: StudentProgress,
});

function StudentProgress() {
  const { settings } = useStore();
  const [studentRecord, setStudentRecord] = useState<Student | null>(null);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [allEvals, setAllEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ student: Student }>("/auth/me"),
      api.get<Evaluation[]>("/api/evaluations"),
    ])
      .then(([me, evaluations]) => {
        setStudentRecord(me.student);
        setAllEvals(evaluations);
        setEvals(evaluations.filter((e) => e.studentId === me.student?.id).sort((a, b) => a.week - b.week));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !studentRecord) {
    return (
      <StudentShell title="My Progress">
        <div className="flex items-center justify-center py-24">
          <Spin className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </StudentShell>
    );
  }

  const stats = studentStats(studentRecord.id, allEvals);
  const latest = evals[evals.length - 1];
  const CURRENT_WEEK = getCurrentWeek(settings);
  const currentWeekEval = evals.find((e) => e.week === CURRENT_WEEK);
  const allCurrentWeek = allEvals.filter((e) => e.week === CURRENT_WEEK);
  const classAvg = allCurrentWeek.length
    ? Math.round(allCurrentWeek.reduce((s, e) => s + e.total, 0) / allCurrentWeek.length)
    : null;

  const trendData = evals.map((e) => ({ week: `W${e.week}`, score: e.total }));
  const radarData = CATEGORIES.map((c) => ({
    category: c.short,
    value: latest ? Math.round(((latest.scores as Record<string, number>)[c.key] / c.max) * 100) : 0,
  }));

  const TrendIcon = stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus;
  const trendColor = stats.trend > 0 ? "text-[color:var(--success)]" : stats.trend < 0 ? "text-[color:var(--danger)]" : "text-muted-foreground";

  if (evals.length === 0) {
    return (
      <StudentShell title="My Progress">
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <TrendingUp className="h-10 w-10 mb-3 opacity-20" />
          <p className="font-medium">No evaluations yet</p>
          <p className="text-sm mt-1">Check back after your first weekly evaluation.</p>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="My Progress">
      <div className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "This Week", value: currentWeekEval ? `${currentWeekEval.total}/100` : "—", sub: currentWeekEval ? <PerfBadge total={currentWeekEval.total} /> : null },
            { label: "Average",   value: `${stats.avg}/100` },
            { label: "Best",      value: `${stats.high}/100`, sub: <span className="text-xs text-brand flex items-center gap-1"><Award className="h-3 w-3" />personal best</span> },
            { label: "Trend",     value: <span className={`flex items-center gap-1 ${trendColor}`}><TrendIcon className="h-5 w-5" />{stats.trend > 0 ? `+${stats.trend}` : stats.trend}</span>, sub: <span className="text-xs text-muted-foreground">vs last week</span> },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</div>
                <div className="mt-2 text-2xl font-bold">{item.value}</div>
                {item.sub && <div className="mt-1">{item.sub}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Class comparison */}
        {classAvg !== null && currentWeekEval && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Your score vs class average (Week {CURRENT_WEEK})</span>
                <span className="text-xs text-muted-foreground">
                  {currentWeekEval.total >= classAvg
                    ? `+${currentWeekEval.total - classAvg} above avg`
                    : `${currentWeekEval.total - classAvg} below avg`}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs w-20 text-muted-foreground">You</span>
                  <Progress value={currentWeekEval.total} className="h-3 flex-1" />
                  <span className="text-xs font-bold w-8 text-right">{currentWeekEval.total}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs w-20 text-muted-foreground">Class avg</span>
                  <Progress value={classAvg} className="h-3 flex-1 opacity-50" />
                  <span className="text-xs font-bold w-8 text-right">{classAvg}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Score History</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={3} dot={{ fill: "var(--brand)", r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Latest Category Mix</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                    <Radar dataKey="value" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Latest breakdown */}
        {latest && (
          <Card>
            <CardHeader><CardTitle className="text-base">Latest Breakdown | Week {latest.week}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {CATEGORIES.map((c) => {
                const v = (latest.scores as Record<string, number>)[c.key];
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{c.label}</span>
                      <span className="text-sm font-bold tabular-nums">{v}<span className="text-muted-foreground font-normal">/{c.max}</span></span>
                    </div>
                    <Progress value={(v / c.max) * 100} className="h-2" />
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-3 border-t font-bold">
                <span>Total</span>
                <span className="tabular-nums">{latest.total}<span className="text-muted-foreground font-normal">/{MAX_TOTAL}</span></span>
              </div>
              {latest.notes && (
                <div className="rounded-md bg-muted p-4 border-l-2 border-brand text-sm">
                  <div className="text-xs font-semibold text-brand mb-1">Instructor Feedback</div>
                  {latest.notes as string}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* All weekly scores */}
        <Card>
          <CardHeader><CardTitle className="text-base">All Weekly Scores</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {[...evals].reverse().map((e) => (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-16 font-semibold text-sm text-muted-foreground">Week {e.week}</div>
                  <Progress value={(e.total / MAX_TOTAL) * 100} className="h-2 flex-1" />
                  <div className="w-16 text-right font-bold tabular-nums text-sm">{e.total}/100</div>
                  <PerfBadge total={e.total} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <GradingScale />
      </div>
    </StudentShell>
  );
}
