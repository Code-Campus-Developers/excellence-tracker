import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";
import { getCurrentWeek, useStore } from "@/lib/store";
import { StudentShell } from "@/components/StudentShell";
import type { Student, Evaluation } from "@/lib/tracking";

export const Route = createFileRoute("/student/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard | CodeCampus" }] }),
  component: StudentLeaderboard,
});

function StudentLeaderboard() {
  const { student: authStudent } = useAuth();
  const { settings } = useStore();
  const currentWeek = getCurrentWeek(settings);
  const [students, setStudents] = useState<Student[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Student[]>("/api/students"),
      api.get<Evaluation[]>("/api/evaluations"),
    ])
      .then(([s, e]) => { setStudents(s ?? []); setEvals(e ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const ranked = students
    .map((s) => ({ ...s, score: evals.find((evaluation) => evaluation.studentId === s.id && evaluation.week === currentWeek)?.total ?? null }))
    .filter((s) => s.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const myId = authStudent?.id;

  return (
    <StudentShell title="Leaderboard">
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand" /> Class Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : ranked.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">No Week {currentWeek} evaluations yet.</p>
            ) : (
              <div className="divide-y">
                {ranked.map((s, i) => {
                  const isMe = s.id === myId;
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  return (
                    <div key={s.id} className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-brand-soft" : ""}`}>
                      <div className="w-8 font-bold text-sm text-muted-foreground flex items-center">
                        {medal ?? `#${i + 1}`}
                      </div>
                      <Avatar name={s.name} color={s.avatarColor} size={32} photo={s.profilePicture} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? "text-brand font-semibold" : ""}`}>
                          {s.name}{isMe && <span className="ml-1 text-[10px] font-normal">(you)</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold tabular-nums text-sm">{s.score}/100</span>
                        <PerfBadge total={s.score ?? 0} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
