import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { GraduationCap, TrendingUp, TrendingDown, Minus, Award, Trophy, LogOut, UserCog, Bell } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, RadarChart, Radar, PolarAngleAxis, PolarGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { CATEGORIES, MAX_TOTAL, CURRENT_WEEK, studentStats, studentEvals } from "@/lib/tracking";
import { useAuth } from "@/lib/authStore";
import { api } from "@/lib/api";
import { GradingScale } from "@/components/GradingScale";
import type { Student, Evaluation } from "@/lib/tracking";

export const Route = createFileRoute("/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [studentRecord, setStudentRecord] = useState<Student | null>(null);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allEvals, setAllEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{id:string;message:string;link:string;isRead:boolean;createdAt:string}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<typeof notifications>("/api/notifications");
      setNotifications(data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleBellClick = async () => {
    setShowNotifications((p) => !p);
    if (!showNotifications && unreadCount > 0) {
      try {
        await api.put("/api/notifications/read-all", {});
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch { /* silent */ }
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.del(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch { /* silent */ }
  };

  const clearAll = async () => {
    try {
      await api.del("/api/notifications/clear");
      setNotifications([]);
    } catch { /* silent */ }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("excellence_auth");
    if (!raw) { navigate({ to: "/login" }); return; }
    try {
      const { user: u } = JSON.parse(raw) as { user: { role: string } };
      if (u.role !== "STUDENT") { navigate({ to: "/login" }); return; }
    } catch {
      navigate({ to: "/login" }); return;
    }

    // Fetch all data needed for the dashboard
    Promise.all([
      api.get<{ user: { id: string; name: string; email: string }; student: Student }>("/auth/me"),
      api.get<Student[]>("/api/students"),
      api.get<Evaluation[]>("/api/evaluations"),
    ])
      .then(([me, students, evaluations]) => {
        setStudentRecord(me.student);
        setAllStudents(students);
        setAllEvals(evaluations);
        setEvals(evaluations.filter((e) => e.studentId === me.student?.id).sort((a, b) => a.week - b.week));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate({ to: "/login" }); };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full mx-auto mb-3" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  if (error || !studentRecord) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-3">{error ?? "Student profile not found."}</p>
          <button onClick={handleLogout} className="text-brand hover:underline text-sm">Log out</button>
        </div>
      </div>
    );
  }

  const stats = studentStats(studentRecord.id, allEvals);
  const latest = evals[evals.length - 1];
  const currentWeekEval = evals.find((e) => e.week === CURRENT_WEEK);

  const allCurrentWeek = allEvals.filter((e) => e.week === CURRENT_WEEK);
  const classAvg = allCurrentWeek.length
    ? Math.round(allCurrentWeek.reduce((s, e) => s + e.total, 0) / allCurrentWeek.length)
    : null;

  const allStudentAvgs = allStudents
    .map((s) => ({ id: s.id, avg: studentStats(s.id, allEvals).avg }))
    .filter((s) => s.avg > 0)
    .sort((a, b) => b.avg - a.avg);
  const rank = allStudentAvgs.findIndex((s) => s.id === studentRecord.id) + 1;
  const totalRanked = allStudentAvgs.length;

  const trendData = evals.map((e) => ({ week: `W${e.week}`, score: e.total }));
  const radarData = CATEGORIES.map((c) => ({
    category: c.short,
    value: latest ? Math.round(((latest.scores as Record<string, number>)[c.key] / c.max) * 100) : 0,
  }));

  const TrendIcon = stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus;
  const trendColor = stats.trend > 0 ? "text-[color:var(--success)]" : stats.trend < 0 ? "text-[color:var(--danger)]" : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b px-4 md:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/image-1784557444135.png" alt="Code Campus" className="h-8 w-auto" />
          <span className="text-muted-foreground text-sm hidden sm:inline">· Student Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{studentRecord.track} Track</div>
          </div>
          <div className="relative" ref={notifRef}>
            <button onClick={handleBellClick}
              className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <span className="font-semibold text-sm">Notifications</span>
                  {notifications.length > 0 && (
                    <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive">Clear all</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y">
                    {notifications.map((n) => (
                      <div key={n.id}
                        className={`flex items-start gap-2 px-4 py-3 group ${!n.isRead ? "bg-brand-soft" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => deleteNotification(n.id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 text-base leading-none mt-0.5">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <Link to="/change-password"
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center" title="Change password">
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </Link>
          <button onClick={handleLogout}
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center" title="Logout">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Profile */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={studentRecord.name} color={studentRecord.avatarColor} size={64} />
                <div>
                  <h1 className="text-2xl font-bold">{studentRecord.name}</h1>
                  <p className="text-sm text-muted-foreground">{user?.email} · {studentRecord.track} Track</p>
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
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Current Week", value: currentWeekEval ? `${currentWeekEval.total}/100` : "—", sub: currentWeekEval ? <PerfBadge total={currentWeekEval.total} /> : null },
                { label: "Average Score", value: `${stats.avg}/100` },
                { label: "Best Score", value: `${stats.high}/100`, sub: <span className="text-xs text-brand flex items-center gap-1"><Award className="h-3 w-3" />personal best</span> },
                { label: "Trend", value: <span className={`flex items-center gap-1 ${trendColor}`}><TrendIcon className="h-5 w-5" />{stats.trend > 0 ? `+${stats.trend}` : stats.trend}</span>, sub: <span className="text-xs text-muted-foreground">vs last week</span> },
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
                      <Progress value={currentWeekEval ? currentWeekEval.total : 0} className="h-3 flex-1" />
                      <span className="text-xs font-bold w-10 text-right">{currentWeekEval ? currentWeekEval.total : "—"}</span>
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
                <CardHeader><CardTitle className="text-base">Latest Breakdown, Week {latest.week}</CardTitle></CardHeader>
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
                    <div className="mt-2 rounded-md bg-muted p-4 border-l-2 border-brand text-sm">
                      <div className="text-xs font-semibold text-brand mb-1">Mentor Feedback</div>
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
                      <div className="w-14 font-semibold text-sm text-muted-foreground">Week {e.week}</div>
                      <Progress value={(e.total / MAX_TOTAL) * 100} className="h-2 flex-1" />
                      <div className="w-16 text-right font-bold tabular-nums text-sm">{e.total}/100</div>
                      <PerfBadge total={e.total} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Class Leaderboard */}
            {allStudentAvgs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-brand" /> Class Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {allStudentAvgs.slice(0, 10).map((row, i) => {
                      const s = allStudents.find((st) => st.id === row.id);
                      if (!s) return null;
                      const isMe = s.id === studentRecord.id;
                      return (
                        <div key={s.id} className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-brand-soft" : ""}`}>
                          <div className="w-8 font-bold text-sm text-muted-foreground">#{i + 1}</div>
                          <Avatar name={s.name} color={s.avatarColor} size={32} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isMe ? "text-brand" : ""}`}>
                              {isMe ? `${s.name} (You)` : s.name}
                            </div>
                            <div className="text-xs text-muted-foreground">{s.track}</div>
                          </div>
                          <div className="font-bold tabular-nums text-sm">{row.avg}/100</div>
                          <PerfBadge total={row.avg} />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
        <div className="pb-2">
          <p className="text-sm font-medium mb-3">Grading Scale</p>
          <GradingScale compact />
        </div>
        <p className="text-center text-xs text-muted-foreground pb-4">
          Code Campus Excellence Tracker · Questions? Contact your mentor.
        </p>
      </main>
    </div>
  );
}
