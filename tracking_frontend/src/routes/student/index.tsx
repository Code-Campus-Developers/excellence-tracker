import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, TrendingUp, TrendingDown, Minus, Award, Trophy, ClipboardCheck, MessageCircle, CalendarClock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { CATEGORIES, MAX_TOTAL, studentStats, studentEvals } from "@/lib/tracking";
import { useAuth } from "@/lib/authStore";
import { api } from "@/lib/api";
import { Link } from "@tanstack/react-router";
import { StudentShell } from "@/components/StudentShell";
import { useStore, getCurrentWeek } from "@/lib/store";
import type { Student, Evaluation } from "@/lib/tracking";

export const Route = createFileRoute("/student/")({
  head: () => ({ meta: [{ title: "Dashboard | CodeCampus" }] }),
  component: StudentHome,
});

function StudentHome() {
  const { user, student: authStudent } = useAuth();
  const { settings } = useStore();
  const navigate = useNavigate();

  const [studentRecord, setStudentRecord] = useState<Student | null>(null);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allEvals, setAllEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ user: { id: string }; student: Student }>("/auth/me"),
      api.get<Student[]>("/api/students"),
      api.get<Evaluation[]>("/api/evaluations"),
    ])
      .then(([me, students, evaluations]) => {
        setStudentRecord(me.student);
        setAllStudents(students);
        setAllEvals(evaluations);
        setEvals(evaluations.filter((e) => e.studentId === me.student?.id).sort((a, b) => a.week - b.week));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <StudentShell title="Dashboard">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </StudentShell>
    );
  }

  if (error || !studentRecord) {
    return (
      <StudentShell title="Dashboard">
        <div className="flex items-center justify-center py-24 text-muted-foreground">{error ?? "Profile not found."}</div>
      </StudentShell>
    );
  }

  const stats = studentStats(studentRecord.id, allEvals);
  const CURRENT_WEEK = getCurrentWeek(settings);
  const currentWeekEval = evals.find((e) => e.week === CURRENT_WEEK);
  const latest = evals[evals.length - 1];

  const allStudentAvgs = allStudents
    .map((s) => ({ id: s.id, avg: studentStats(s.id, allEvals).avg }))
    .filter((s) => s.avg > 0)
    .sort((a, b) => b.avg - a.avg);
  const rank = allStudentAvgs.findIndex((s) => s.id === studentRecord.id) + 1;
  const totalRanked = allStudentAvgs.length;

  const TrendIcon = stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus;
  const trendColor = stats.trend > 0 ? "text-[color:var(--success)]" : stats.trend < 0 ? "text-[color:var(--danger)]" : "text-muted-foreground";

  const quickLinks = [
    { to: "/student/progress",   icon: TrendingUp,     label: "My Progress",  desc: "Charts & full history" },
    { to: "/student/self-report",icon: ClipboardCheck, label: "Self-Report",  desc: "Log your weekly activities" },
    { to: "/student/messages",   icon: MessageCircle,  label: "Messages",     desc: "Chat with your instructor" },
    { to: "/student/attendance", icon: CalendarClock,  label: "Attendance",   desc: "Clock in / Clock out" },
  ];

  return (
    <StudentShell title="Dashboard">
      {/* Profile card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name ?? ""}
                  className="h-16 w-16 rounded-full object-cover shrink-0" />
              ) : (
                <Avatar name={studentRecord.name} color={studentRecord.avatarColor} size={64} photo={studentRecord.profilePicture} />
              )}
              <div>
                <h1 className="text-2xl font-bold">{studentRecord.name}</h1>
                <p className="text-sm text-muted-foreground">{user?.email} · {studentRecord.track} Track</p>
                {studentRecord.studentCode && (
                  <span className="inline-block mt-1 text-xs font-mono px-2 py-0.5 bg-brand-soft text-brand rounded-full">
                    {studentRecord.studentCode}
                  </span>
                )}
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

      {/* Stats row */}
      {evals.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "This Week", value: currentWeekEval ? `${currentWeekEval.total}/100` : "—", sub: currentWeekEval ? <PerfBadge total={currentWeekEval.total} /> : null },
              { label: "Average",   value: `${stats.avg}/100` },
              { label: "Best Score",value: `${stats.high}/100`, sub: <span className="text-xs text-brand flex items-center gap-1"><Award className="h-3 w-3" />personal best</span> },
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

          {/* Latest instructor feedback */}
          {latest?.notes && (
            <Card className="mb-6">
              <CardContent className="p-4 border-l-4 border-brand">
                <p className="text-xs font-semibold text-brand mb-1">Latest Instructor Feedback | Week {latest.week}</p>
                <p className="text-sm">{latest.notes as string}</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-10 text-center">
            <div className="h-12 w-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="h-6 w-6 text-brand" />
            </div>
            <p className="font-semibold">No evaluations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back after your first weekly evaluation.</p>
          </CardContent>
        </Card>
      )}

      {/* Quick action cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickLinks.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to}>
            <Card className="hover:border-brand/50 hover:shadow-sm transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-start gap-2">
                <Icon className="h-5 w-5 text-brand" />
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </StudentShell>
  );
}
