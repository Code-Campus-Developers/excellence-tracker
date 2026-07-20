import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { STUDENTS, studentStats } from "@/lib/tracking";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Students — CodeCampus Excellence Tracker" },
      { name: "description", content: "Browse and search all bootcamp students." },
    ],
  }),
  component: StudentsList,
});

function StudentsList() {
  const { evaluations, students } = useStore();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    return students.map((s) => ({ ...s, stats: studentStats(s.id, evaluations) })).filter((s) =>
      (s.name + s.track + s.email).toLowerCase().includes(q.toLowerCase()),
    );
  }, [q, evaluations, students]);

  return (
    <AppShell>
      <PageHeader
        title="Students"
        subtitle={`${students.length} students enrolled in the current cohort.`}
      />

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or track..."
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {rows.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No students match your search.
            </div>
          )}
          {rows.map((s) => (
            <Link
              key={s.id}
              to="/students/$id"
              params={{ id: s.id }}
              className="flex items-center gap-4 p-4 hover:bg-muted transition-colors"
            >
              <Avatar name={s.name} color={s.avatarColor} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.email} · {s.track}
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs text-muted-foreground">Evaluations</div>
                <div className="font-semibold">{s.stats.count}</div>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs text-muted-foreground">Average</div>
                <div className="font-semibold">
                  {s.stats.count ? `${s.stats.avg}/100` : "—"}
                </div>
              </div>
              {s.stats.count > 0 ? (
                <PerfBadge total={s.stats.avg} />
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  Not evaluated
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
