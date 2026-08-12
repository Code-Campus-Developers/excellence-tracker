import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Bell, Trash2, CheckCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";
import { AppShell } from "@/components/AppShell";
import { StudentShell } from "@/components/StudentShell";
import { ParentShell } from "@/components/ParentShell";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications | CodeCampus" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) throw redirect({ to: "/" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as Record<string, unknown>)) throw e;
      throw redirect({ to: "/" });
    }
  },
  component: NotificationsPage,
});

interface Notification {
  id: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<Notification[]>("/api/notifications");
      setNotifications(data ?? []);
    } catch {/* */} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    api.put("/api/notifications/read-all", {}).catch(() => {/* */});
  }, [fetchNotifications]);

  const deleteOne = async (id: string) => {
    await api.del(`/api/notifications/${id}`).catch(() => {/* */});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = async () => {
    await api.del("/api/notifications/clear").catch(() => {/* */});
    setNotifications([]);
  };

  const handleClick = (n: Notification) => {
    if (n.link) navigate({ to: n.link as "/" });
  };

  const backTo =
    user?.role === "ADMIN" ? "/admin"
    : user?.role === "MENTOR" ? "/instructor"
    : user?.role === "PARENT" ? "/parent"
    : "/student";

  const content = (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: backTo as "/" })}
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </h1>
        </div>
        {notifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive gap-1">
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <CheckCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">You&apos;re all caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">No notifications at the moment.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden bg-background">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-4 group cursor-pointer hover:bg-muted/50 transition-colors ${!n.isRead ? "bg-brand-soft" : ""}`}
              onClick={() => handleClick(n)}
            >
              <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.isRead ? "bg-brand" : "bg-transparent"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteOne(n.id); }}
                className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (user?.role === "STUDENT") return <StudentShell>{content}</StudentShell>;
  if (user?.role === "PARENT") return <ParentShell>{content}</ParentShell>;
  return <AppShell>{content}</AppShell>;
}

