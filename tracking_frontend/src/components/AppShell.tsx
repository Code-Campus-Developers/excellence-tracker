import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, ClipboardCheck, Users, Trophy,
  Search, Bell, Menu, LogOut, Shield, UserCog, GraduationCap, MessageCircle, CreditCard, FileText, CalendarDays, Users2, ScanLine,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { TOTAL_WEEKS } from "@/lib/tracking";
import { useAuth } from "@/lib/authStore";
import { useStore, getCurrentWeek } from "@/lib/store";
import { api } from "@/lib/api";

interface Notification {
  id: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

const ADMIN_EXTRA_NAV = [
  { to: "/admin/manage", label: "User Management", icon: Shield },
  { to: "/admin/bulk-import", label: "Bulk Import", icon: FileText },
  { to: "/admin/track-assignments", label: "Track Assignments", icon: GraduationCap },
  { to: "/admin/settings", label: "Settings", icon: UserCog },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, logout, student } = useAuth();
  const { students, settings } = useStore();

  const trackWeek = student?.track ? (settings.track_weeks[student.track] ?? settings.total_weeks) : null;
  const displayWeek = trackWeek ?? getCurrentWeek(settings);

  const [searchQ, setSearchQ] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<Notification[]>("/api/notifications");
      setNotifications(data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleBellClick = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening) {
      // Re-fetch on every open so notifications are always fresh
      await fetchNotifications();
      if (unreadCount > 0) {
        try {
          await api.put("/api/notifications/read-all", {});
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch { /* silent */ }
      }
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

  const filteredStudents = searchQ.trim().length > 0
    ? students.filter((s) =>
        (s.name + s.track).toLowerCase().includes(searchQ.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const primaryDashboard = user?.role === "ADMIN" ? "/admin" : "/instructor";

  const MENTOR_NAV = [
    { to: primaryDashboard, label: "Dashboard", icon: LayoutDashboard },
    { to: "/instructor/evaluate", label: "New Evaluation", icon: ClipboardCheck },
    { to: "/instructor/students", label: "Students", icon: Users },
    { to: "/instructor/instructors", label: "Instructors", icon: GraduationCap },
    // Parent Portal — admin only
    ...(user?.role === "ADMIN" ? [{ to: "/admin/parents", label: "Parent Portal", icon: Users2 }] : []),
    { to: "/instructor/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/instructor/messages", label: "Messages", icon: MessageCircle },
    { to: user?.role === "ADMIN" ? "/admin/reports" : "/instructor/reports", label: "Self-Reports", icon: FileText },
    { to: user?.role === "ADMIN" ? "/admin/attendance-overview" : "/instructor/attendance-overview", label: "Attendance", icon: CalendarDays },
    { to: "/scanner", label: "QR Scanner", icon: ScanLine },
    // ID Card only for instructors, not admins
    ...(user?.role === "MENTOR" ? [{ to: "/instructor/id-card", label: "ID Card", icon: CreditCard }] : []),
    // Only show instructor settings for MENTOR role | admins use /admin/settings
    ...(user?.role === "MENTOR" ? [{ to: "/instructor/settings", label: "Settings", icon: UserCog }] : []),
  ];

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQ.trim()) {
      navigate({ to: "/instructor/students" });
      setSearchQ("");
    }
  };

  const handleLogout = () => {
    logout();
    if (user?.role === "MENTOR") navigate({ to: "/instructor-login" });
    else if (user?.role === "ADMIN") navigate({ to: "/admin-login" });
    else navigate({ to: "/login" });
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="min-h-screen bg-muted/40 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-sidebar sticky top-0 h-screen">
        <div className="flex items-center px-4 h-16 border-b">
          <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus International" className="h-14 w-auto max-w-full object-contain" />
        </div>

        <div className="px-4 py-4">
          <div className="rounded-lg bg-brand-soft px-3 py-2.5">
            <div className="text-[10px] font-semibold tracking-wider text-brand">
              EXCELLENCE TRACKER
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Weekly evaluations</div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto min-h-0">
          {MENTOR_NAV.map((item) => {
            const active =
              item.to === primaryDashboard ? pathname === primaryDashboard : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-sidebar-foreground hover:bg-muted",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {user?.role === "ADMIN" && (
            <>
              {ADMIN_EXTRA_NAV.map((item) => {
                const active = pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={[
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-sidebar-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          <div className="rounded-lg bg-brand text-brand-foreground p-4">
              <div className="text-xs font-semibold opacity-90">Week</div>
            <div className="text-3xl font-bold mt-1">{displayWeek} / {settings.total_weeks}</div>
          </div>
        </div>
      </aside>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Mobile nav drawer */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r bg-sidebar transition-transform duration-200 md:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center px-4 h-16 border-b">
          <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus International" className="h-14 w-auto max-w-full object-contain" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {MENTOR_NAV.map((item) => {
            const active =
              item.to === primaryDashboard ? pathname === primaryDashboard : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileNavOpen(false)}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-sidebar-foreground hover:bg-muted",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {user?.role === "ADMIN" && (
            <>
              {ADMIN_EXTRA_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-muted">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          <div className="rounded-lg bg-brand text-brand-foreground p-4">
            <div className="text-xs font-semibold opacity-90">Week</div>
            <div className="text-3xl font-bold mt-1">{displayWeek} / {settings.total_weeks}</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b h-16 flex items-center gap-4 px-4 md:px-8">
          <button
            className="md:hidden h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="max-w-xs w-full relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students or mentors"
              className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background"
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              onKeyDown={handleSearch}
            />
            {showResults && searchQ.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredStudents.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No results found</div>
                )}
                {filteredStudents.map((s) => (
                  <Link
                    key={s.id}
                    to="/instructor/students/$id"
                    params={{ id: s.id }}
                    onClick={() => { setSearchQ(""); setShowResults(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                  >
                    <div className="h-7 w-7 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                      {s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.track}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleBellClick}
                className="relative h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <>
                  {/* backdrop – closes on tap */}
                  <div className="fixed inset-0 z-[59] md:hidden" onClick={() => setShowNotifications(false)} />
                  <div className="fixed left-1/2 -translate-x-1/2 top-14 w-80 max-h-[70vh] md:absolute md:left-auto md:translate-x-0 md:right-0 md:top-full md:mt-2 md:w-80 md:max-h-none bg-background border rounded-xl shadow-xl z-[60] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={clearAll}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                        Clear all
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y">
                      {notifications.map((n) => (
                        <div key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 group ${!n.isRead ? "bg-brand-soft" : ""}`}>
                          <Link
                            to="/notifications"
                            onClick={() => setShowNotifications(false)}
                            className="flex items-start gap-3 flex-1 min-w-0"
                          >
                            <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.isRead ? "bg-brand" : "bg-transparent"}`} />
                            <div className="min-w-0">
                              <p className="text-sm leading-snug">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </Link>
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-base leading-none mt-0.5"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t px-4 py-2.5">
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-brand hover:underline font-medium"
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="text-sm font-medium leading-tight">{user?.name ?? "User"}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role === "MENTOR" ? "Instructor" : user?.role === "ADMIN" ? "Admin" : "Student"}</div>
              </div>
              <Link to="/edit-profile" className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center" title="Edit profile">
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </Link>
              <button
                onClick={handleLogout}
                className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"
                title="Logout"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>

        {/* FAB — Scanner shortcut (mobile only, admin/instructor) */}
        <Link
          to="/scanner"
          className="fixed bottom-6 right-5 z-50 flex md:hidden h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg hover:bg-brand/90 active:scale-95 transition-all"
          title="Open Scanner"
        >
          <ScanLine className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
