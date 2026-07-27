import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Medal, Award } from "lucide-react";
import { useMemo, useState } from "react";
import { STUDENTS, studentStats, studentEvals } from "@/lib/tracking";
import { useStore, getCurrentWeek } from "@/lib/store";
import { GradingScale } from "@/components/GradingScale";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/instructor/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard | CodeCampus Excellence Tracker" },
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
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const totalPages = Math.ceil(rows.length / PER_PAGE);
  const pagedRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const offset = (page - 1) * PER_PAGE;

  return (
    <>
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[60px_1fr_100px_120px] items-center px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
          <div>Rank</div>
          <div>Student</div>
          <div className="text-right">{scoreLabel}</div>
          <div className="text-right">Level</div>
        </div>
        <div className="divide-y">
          {pagedRows.map((s, i) => {
            const score = getScore(s.id);
            const globalRank = offset + i;
            return (
              <Link
                key={s.id}
                to="/instructor/students/$id"
                params={{ id: s.id }}
                className="grid grid-cols-[60px_1fr_100px_120px] items-center px-5 py-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                  #{globalRank + 1} {rankIcon(globalRank)}
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
    <Pagination page={page} totalPages={totalPages} onPage={setPage} totalItems={rows.length} perPage={PER_PAGE} />
    </>
  );
}

function Leaderboard() {
  const { evaluations, students, settings } = useStore();
  const CURRENT_WEEK = getCurrentWeek(settings);
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
      <div className="mb-6">
        <p className="text-sm font-medium mb-3">Grading Scale</p>
        <GradingScale compact />
      </div>

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
