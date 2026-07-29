import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, TrendingUp, ClipboardCheck, MessageCircle,
  CalendarClock, Trophy, Bell, LogOut, UserCog, Menu, CreditCard,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/authStore";
import { Avatar } from "@/components/PerfBadge";
import { api } from "@/lib/api";
import { useStore, getCurrentWeek } from "@/lib/store";

const NAV = [
  { to: "/student",             label: "Dashboard",   icon: LayoutDashboard, exact: true },
  { to: "/student/id-card",     label: "ID Card",     icon: CreditCard },
  { to: "/student/progress",    label: "My Progress", icon: TrendingUp },
  { to: "/student/self-report", label: "Self-Report", icon: ClipboardCheck },
  { to: "/student/messages",    label: "Messages",    icon: MessageCircle },
  { to: "/student/attendance",  label: "Attendance",  icon: CalendarClock },
  { to: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
];

interface StudentShellProps {
  children: ReactNode;
  title?: string;
}

export function StudentShell({ children, title }: StudentShellProps) {
  const { user, student, logout } = useAuth();
  const { settings } = useStore();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const pathname = location.pathname;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<{id:string;message:string;link:string;isRead:boolean;createdAt:string}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<typeof notifications>("/api/notifications");
      setNotifications(data ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const { count } = await api.get<{ count: number }>("/api/messages/unread-count");
      setUnreadMessages(count ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadMessages();
    const i1 = setInterval(fetchNotifications, 60_000);
    const i2 = setInterval(fetchUnreadMessages, 30_000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [fetchNotifications, fetchUnreadMessages]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleBellClick = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadCount > 0) {
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

  const handleLogout = () => { logout(); navigate({ to: "/login" }); };

  const initials = student?.name
    ? student.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center px-4 h-16 border-b shrink-0">
        <img src="/image-1785130765553.png" alt="Code Campus" className="h-20 w-auto max-w-full" style={{ mixBlendMode: "multiply" }} />
      </div>

      {/* Student info */}
      <div className="px-4 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt={user.name ?? ""} className="h-10 w-10 rounded-full object-cover shrink-0" />
          ) : student ? (
            <Avatar name={student.name} color={student.avatarColor} size={40} />
          ) : (
            <div className="h-10 w-10 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-sm font-bold shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{student?.track}</p>
            {student?.studentCode && (
              <p className="text-[10px] font-mono text-brand truncate">{student.studentCode}</p>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto min-h-0">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          const isMessages = item.to === "/student/messages";
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                active ? "bg-brand-soft text-brand" : "text-sidebar-foreground hover:bg-muted",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
              {isMessages && unreadMessages > 0 && (
                <span className="ml-auto h-4 w-4 bg-brand text-brand-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — cohort/week bar */}
      <div className="p-4 border-t shrink-0">
        <div className="rounded-lg bg-brand text-brand-foreground p-4">
          <div className="text-xs font-semibold opacity-90">Week</div>
          <div className="text-3xl font-bold mt-1">{getCurrentWeek(settings)} / {settings.total_weeks}</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/40 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-sidebar sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 h-full bg-sidebar border-r overflow-y-auto">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-background border-b px-4 md:px-6 h-14 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
              <Menu className="h-5 w-5" />
            </button>
            {title && <h1 className="text-base font-semibold hidden sm:block">{title}</h1>}
          </div>

          <div className="flex items-center gap-1">
            {/* Notification bell */}
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
                      <button onClick={async () => {
                        try { await api.del("/api/notifications/clear"); setNotifications([]); } catch {/* */}
                      }} className="text-xs text-muted-foreground hover:text-destructive">Clear all</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y">
                      {notifications.map((n) => (
                        <div key={n.id} className={`flex items-start gap-2 px-4 py-3 group ${!n.isRead ? "bg-brand-soft" : ""}`}>
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

            {/* Profile pic / avatar */}
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user.name ?? ""}
                className="h-9 w-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
            )}
            <div className="hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user?.name}</div>
              <div className="text-xs text-muted-foreground">Student</div>
            </div>

            {/* Edit profile */}
            <Link to="/student/edit-profile" title="Edit Profile"
              className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </Link>

            {/* Logout */}
            <button onClick={handleLogout} title="Log Out"
              className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 md:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
