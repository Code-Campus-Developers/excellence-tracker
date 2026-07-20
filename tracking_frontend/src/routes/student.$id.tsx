import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, TrendingUp, TrendingDown, Minus, Award, Trophy } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import {
  CATEGORIES,
  MAX_TOTAL,
  CURRENT_WEEK,
  studentEvals,
  studentStats,
} from "@/lib/tracking";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/student/$id")({
  loader: ({ params }) => ({ id: params.id }),
  component: StudentPortal,
});

function StudentPortal() {
  const { id } = Route.useLoaderData();
  const { students, evaluations } = useStore();
  const student = students.find((s) => s.id === id);

  if (!student) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-brand" />
          </div>
          <h1 className="text-xl font-bold">Student not found</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This link may be incorrect. Contact your mentor.
          </p>
        </div>
      </div>
    );
  }

  const evals = studentEvals(student.id, evaluations);
  const stats = studentStats(student.id, evaluations);
  const latest = evals[evals.length - 1];
  const currentWeekEval = evals.find((e) => e.week === CURRENT_WEEK);

  // Class average for current week
  const allCurrentWeek = evaluations.filter((e) => e.week === CURRENT_WEEK);
  const classAvg = allCurrentWeek.length
    ? Math.round(allCurrentWeek.reduce((s, e) => s + e.total, 0) / allCurrentWeek.length)
    : null;

  // Rank among all evaluated students
  const allStudentAvgs = students
    .map((s) => ({ id: s.id, avg: studentStats(s.id, evaluations).avg }))
    .filter((s) => s.avg > 0)
    .sort((a, b) => b.avg - a.avg);
  const rank = allStudentAvgs.findIndex((s) => s.id === student.id) + 1;
  const totalRanked = allStudentAvgs.length;

  const trendData = evals.map((e) => ({ week: `W${e.week}`, score: e.total }));
  const radarData = CATEGORIES.map((c) => ({
    category: c.short,
    value: latest ? Math.round((latest.scores[c.key] / c.max) * 100) : 0,
  }));

  const TrendIcon =
    stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus;
  const trendColor =
    stats.trend > 0
      ? "text-[color:var(--success)]"
      : stats.trend < 0
        ? "text-[color:var(--danger)]"
        : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header bar */}
      <header className="bg-background border-b px-4 md:px-8 h-16 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-brand text-brand-foreground flex items-center justify-center">
          <GraduationCap className="h-4 w-4" />
        </div>
        <span className="font-semibold text-base">CodeCampus</span>
        <span className="text-muted-foreground text-sm hidden sm:inline">· Student Portal</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Profile card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={student.name} color={student.avatarColor} size={64} />
                <div>
                  <h1 className="text-2xl font-bold">{student.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {student.email} · {student.track} Track
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {rank > 0 && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-brand font-bold text-lg">
                      <Trophy className="h-4 w-4" />#{rank}
                    </div>
                    <div className="text-xs text-muted-foreground">of {totalRanked}</div>
                  </div>
                )}
                {stats.count > 0 && <PerfBadge total={stats.avg} />}
              </div>
            </div>
          </CardContent>
        </Card>

        {evals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="h-14 w-14 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="h-6 w-6 text-brand" />
              </div>
              <div className="font-semibold">No evaluations yet</div>
              <div className="text-sm text-muted-foreground mt-1">
                Check back after your mentor completes your first weekly evaluation.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Current Week",
                  value: currentWeekEval ? `${currentWeekEval.total}/100` : "—",
                  sub: currentWeekEval ? <PerfBadge total={currentWeekEval.total} /> : null,
                },
                { label: "Average Score", value: `${stats.avg}/100` },
                {
                  label: "Best Score",
                  value: `${stats.high}/100`,
                  sub: (
                    <span className="text-xs text-brand flex items-center gap-1">
                      <Award className="h-3 w-3" /> personal best
                    </span>
                  ),
                },
                {
                  label: "Trend",
                  value: (
                    <span className={`flex items-center gap-1 ${trendColor}`}>
                      <TrendIcon className="h-5 w-5" />
                      {stats.trend > 0 ? `+${stats.trend}` : stats.trend}
                    </span>
                  ),
                  sub: (
                    <span className="text-xs text-muted-foreground">
                      vs last week
                    </span>
                  ),
                },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-5">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {item.label}
                    </div>
                    <div className="mt-2 text-2xl font-bold">{item.value}</div>
                    {item.sub && <div className="mt-1">{item.sub}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Class average comparison */}
            {classAvg !== null && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Your score vs class average (Week {CURRENT_WEEK})</span>
                    <span className="text-xs text-muted-foreground">
                      {currentWeekEval
                        ? currentWeekEval.total >= classAvg
                          ? `+${currentWeekEval.total - classAvg} above average`
                          : `${currentWeekEval.total - classAvg} below average`
                        : "Not evaluated yet"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-24 text-muted-foreground">You</span>
                      <Progress
                        value={currentWeekEval ? currentWeekEval.total : 0}
                        className="h-3 flex-1"
                      />
                      <span className="text-xs font-bold w-10 text-right">
                        {currentWeekEval ? currentWeekEval.total : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-24 text-muted-foreground">Class avg</span>
                      <Progress value={classAvg} className="h-3 flex-1 opacity-50" />
                      <span className="text-xs font-bold w-10 text-right">{classAvg}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                        <YAxis
                          stroke="var(--muted-foreground)"
                          fontSize={12}
                          domain={[0, 100]}
                        />
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
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis
                          dataKey="category"
                          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
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

            {/* Category scores for latest eval */}
            {latest && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Latest Breakdown — Week {latest.week}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {CATEGORIES.map((c) => {
                    const v = latest.scores[c.key];
                    const pct = (v / c.max) * 100;
                    return (
                      <div key={c.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{c.label}</span>
                          <span className="text-sm font-bold tabular-nums">
                            {v}
                            <span className="text-muted-foreground font-normal">/{c.max}</span>
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-3 border-t font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {latest.total}
                      <span className="text-muted-foreground font-normal">/{MAX_TOTAL}</span>
                    </span>
                  </div>
                  {latest.notes && (
                    <div className="mt-2 rounded-md bg-muted p-4 border-l-2 border-brand text-sm">
                      <div className="text-xs font-semibold text-brand mb-1">
                        Mentor Feedback
                      </div>
                      {latest.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* All evaluations history */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Weekly Scores</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {[...evals].reverse().map((e) => (
                    <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="w-14 font-semibold text-sm text-muted-foreground">
                        Week {e.week}
                      </div>
                      <Progress value={(e.total / MAX_TOTAL) * 100} className="h-2 flex-1" />
                      <div className="w-16 text-right font-bold tabular-nums text-sm">
                        {e.total}/100
                      </div>
                      <PerfBadge total={e.total} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          CodeCampus Excellence Tracker · Questions? Contact your mentor.
        </p>
      </main>
    </div>
  );
}
