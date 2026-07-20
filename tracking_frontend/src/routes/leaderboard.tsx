import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Medal, Award } from "lucide-react";
import { useMemo } from "react";
import { STUDENTS, studentStats, studentEvals, CURRENT_WEEK } from "@/lib/tracking";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — CodeCampus Excellence Tracker" },
      { name: "description", content: "Ranked student performance across the bootcamp." },
    ],
  }),
  component: Leaderboard,
});

function rankIcon(i: number) {
  if (i === 0) return <Trophy className="h-4 w-4 text-[color:var(--warning)]" />;
  if (i === 1) return <Medal className="h-4 w-4 text-muted-foreground" />;
  if (i === 2) return <Award className="h-4 w-4 text-[oklch(0.6_0.15_60)]" />;
  return null;
}

function Board({
  rows,
  scoreLabel,
  getScore,
}: {
  rows: { id: string; name: string; avatarColor: string; track: string }[];
  scoreLabel: string;
  getScore: (id: string) => number;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[60px_1fr_100px_120px] items-center px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
          <div>Rank</div>
          <div>Student</div>
          <div className="text-right">{scoreLabel}</div>
          <div className="text-right">Level</div>
        </div>
        <div className="divide-y">
          {rows.map((s, i) => {
            const score = getScore(s.id);
            return (
              <Link
                key={s.id}
                to="/students/$id"
                params={{ id: s.id }}
                className="grid grid-cols-[60px_1fr_100px_120px] items-center px-5 py-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                  #{i + 1} {rankIcon(i)}
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={s.name} color={s.avatarColor} size={36} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.track}</div>
                  </div>
                </div>
                <div className="text-right font-bold tabular-nums">{score}</div>
                <div className="flex justify-end">
                  <PerfBadge total={score} />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Leaderboard() {
  const { evaluations, students } = useStore();
  const enriched = useMemo(
    () =>
      students.map((s) => {
        const stats = studentStats(s.id, evaluations);
        const current = studentEvals(s.id, evaluations).find((e) => e.week === CURRENT_WEEK)?.total ?? 0;
        return { ...s, stats, current };
      }).filter((s) => s.stats.count > 0),
    [evaluations, students],
  );

  const byCurrent = [...enriched].sort((a, b) => b.current - a.current);
  const byAvg = [...enriched].sort((a, b) => b.stats.avg - a.stats.avg);
  const byHigh = [...enriched].sort((a, b) => b.stats.high - a.stats.high);
  const byLow = [...enriched].sort((a, b) => a.stats.low - b.stats.low);

  return (
    <AppShell>
      <PageHeader
        title="Leaderboard"
        subtitle="See who's leading the pack across the bootcamp."
      />

      <Tabs defaultValue="current">
        <TabsList className="mb-4">
          <TabsTrigger value="current">Current Week</TabsTrigger>
          <TabsTrigger value="avg">Overall Average</TabsTrigger>
          <TabsTrigger value="high">Highest Score</TabsTrigger>
          <TabsTrigger value="low">Lowest Score</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Board rows={byCurrent} scoreLabel={`Week ${CURRENT_WEEK}`} getScore={(id) => byCurrent.find((r) => r.id === id)!.current} />
        </TabsContent>
        <TabsContent value="avg">
          <Board rows={byAvg} scoreLabel="Average" getScore={(id) => byAvg.find((r) => r.id === id)!.stats.avg} />
        </TabsContent>
        <TabsContent value="high">
          <Board rows={byHigh} scoreLabel="Best" getScore={(id) => byHigh.find((r) => r.id === id)!.stats.high} />
        </TabsContent>
        <TabsContent value="low">
          <Board rows={byLow} scoreLabel="Lowest" getScore={(id) => byLow.find((r) => r.id === id)!.stats.low} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
