import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Menu, X, QrCode, UserCog } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAuth } from "@/lib/authStore";

const NAV = [
  { to: "/parent", label: "My Child", icon: LayoutDashboard, exact: true },
  { to: "/parent/qr-codes", label: "QR Code", icon: QrCode },
  { to: "/parent/edit-profile", label: "Edit Profile", icon: UserCog },
];

interface ParentShellProps {
  children: ReactNode;
}

export function ParentShell({ children }: ParentShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const pathname = location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate({ to: "/parent-login" }); };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center px-4 h-16 border-b shrink-0">
        <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus" className="h-14 w-auto max-w-full object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center text-brand-foreground text-xs font-bold shrink-0 overflow-hidden">
            {user?.profilePicture
              ? <img src={user.profilePicture} alt={user?.name ?? ""} className="h-full w-full object-cover" />
              : initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground">Parent</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r bg-card shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-60 h-full bg-card border-r">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="flex md:hidden items-center h-14 px-4 border-b bg-card gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus" className="h-14 w-auto max-w-full object-contain" />
          <span className="font-semibold text-sm">Parent Portal</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
