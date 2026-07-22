import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BookOpen, TrendingUp, TrendingDown, Users, ClipboardCheck, ArrowRight, Trophy,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import {
  CURRENT_WEEK, CATEGORIES, weekEvals, studentStats, MAX_TOTAL,
} from "@/lib/tracking";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/authStore";

function Stat({
  label, value, hint, icon: Icon, accent, to,
}: {
  label: string; value: string | number; hint?: string;
  icon: React.ComponentType<{ className?: string }>; accent?: string; to?: string;
}) {
  const inner = (
    <Card className={to ? "cursor-pointer hover:border-brand transition-colors" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-soft)" }}>
            <Icon className="h-5 w-5 text-brand" />
          </div>
          {accent && <span className="text-xs font-medium px-2 py-1 rounded-full bg-brand-soft text-brand">{accent}</span>}
        </div>
        <div className="mt-4 text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — CodeCampus Excellence Tracker" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  const { evaluations, students } = useStore();

  const thisWeek = weekEvals(CURRENT_WEEK, evaluations);
  const evaluatedCount = thisWeek.length;
  const avgThisWeek = evaluatedCount
    ? Math.round(thisWeek.reduce((s, e) => s + e.total, 0) / evaluatedCount)
    : 0;

  const weeklyTrend = useMemo(() => {
    const arr: { week: string; avg: number }[] = [];
    for (let w = 1; w <= CURRENT_WEEK; w++) {
      const evs = weekEvals(w, evaluations);
      const avg = evs.length ? Math.round(evs.reduce((s, e) => s + e.total, 0) / evs.length) : 0;
      arr.push({ week: `W${w}`, avg });
    }
    return arr;
  }, [evaluations]);

  const categoryBreakdown = useMemo(() => {
    return CATEGORIES.map((c) => {
      const avg = thisWeek.length
        ? Math.round((thisWeek.reduce((s, e) => s + (e.scores as Record<string,number>)[c.key], 0) / thisWeek.length / c.max) * 100)
        : 0;
      return { name: c.short, value: avg };
    });
  }, [thisWeek]);

  const topStudents = useMemo(() => {
    return students.map((s) => ({ ...s, stats: studentStats(s.id, evaluations) }))
      .filter((s) => s.stats.count > 0).sort((a, b) => b.stats.avg - a.stats.avg).slice(0, 5);
  }, [evaluations, students]);

  const needsImprovement = useMemo(() => {
    return students.map((s) => ({ ...s, stats: studentStats(s.id, evaluations) }))
      .filter((s) => s.stats.count > 0 && s.stats.avg < 65)
      .sort((a, b) => a.stats.avg - b.stats.avg).slice(0, 4);
  }, [evaluations, students]);

  return (
    <AppShell>
      <PageHeader
        title={`Welcome back, ${user?.name ?? "Admin"} 👋`}
        subtitle={`Bootcamp Week ${CURRENT_WEEK}, track weekly excellence across all students.`}
        actions={
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/mentor/evaluate">
              <ClipboardCheck className="h-4 w-4" /> New Evaluation
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Students" value={students.length} icon={Users} accent="Enrolled" to="/mentor/students" />
        <Stat label="Evaluated This Week" value={`${evaluatedCount}/${students.length}`} icon={ClipboardCheck} accent={`Week ${CURRENT_WEEK}`} to="/mentor/evaluate" />
        <Stat label="Average Score" value={`${avgThisWeek}/${MAX_TOTAL}`} icon={TrendingUp} accent="This week" to="/mentor/leaderboard" />
        <Stat label="Total Evaluations" value={evaluations.length} icon={BookOpen} accent="All-time" to="/mentor/leaderboard" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Weekly Score Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="avg" stroke="var(--brand)" strokeWidth={3} dot={{ fill: "var(--brand)", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Category Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={90} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="value" fill="var(--brand)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-brand" />Top Performers</CardTitle>
            <Link to="/mentor/leaderboard" className="text-xs text-brand font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {topStudents.map((s, i) => (
              <Link key={s.id} to="/mentor/students/$id" params={{ id: s.id }}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted transition-colors">
                <div className="w-6 text-center font-bold text-muted-foreground text-sm">#{i + 1}</div>
                <Avatar name={s.name} color={s.avatarColor} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.track}</div>
                </div>
                <div className="text-right"><div className="font-bold">{s.stats.avg}</div><div className="text-xs text-muted-foreground">avg</div></div>
                <PerfBadge total={s.stats.avg} />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-[color:var(--warning)]" />Needs Improvement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {needsImprovement.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">All students are on track. 🎉</div>}
            {needsImprovement.map((s) => (
              <Link key={s.id} to="/mentor/students/$id" params={{ id: s.id }}
                className="block hover:bg-muted -mx-2 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar name={s.name} color={s.avatarColor} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.track}</div>
                  </div>
                  <div className="font-bold text-sm">{s.stats.avg}/100</div>
                </div>
                <Progress value={s.stats.avg} className="h-1.5" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
