import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Award, ClipboardCheck, ExternalLink } from "lucide-react";
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

export const Route = createFileRoute("/students/$id")({
  head: ({ params }) => {
    return {
      meta: [
        { title: "Student — Performance" },
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
  const { id } = Route.useLoaderData();
  const { evaluations, students } = useStore();
  const student = students.find((s) => s.id === id);
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
        to="/students"
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
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/student/$id" params={{ id: student.id }} target="_blank">
              <ExternalLink className="h-4 w-4" />
              Student View
            </Link>
          </Button>
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/evaluate">
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
    </AppShell>
  );
}
