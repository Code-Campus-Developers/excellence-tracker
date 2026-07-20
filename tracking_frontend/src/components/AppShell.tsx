import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Trophy,
  Search,
  Bell,
  Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";
import { useState } from "react";
import { CURRENT_WEEK, TOTAL_WEEKS } from "@/lib/tracking";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/evaluate", label: "New Evaluation", icon: ClipboardCheck },
  { to: "/students", label: "Students", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQ.trim()) {
      navigate({ to: "/students" });
      setSearchQ("");
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-sidebar sticky top-0 h-screen">
        <div className="flex items-center px-4 h-16 border-b">
          <img src="/image-1784557444135.png" alt="Code Campus International" className="h-10 w-auto max-w-full" />
        </div>

        <div className="px-4 py-4">
          <div className="rounded-lg bg-brand-soft px-3 py-2.5">
            <div className="text-[10px] font-semibold tracking-wider text-brand">
              EXCELLENCE TRACKER
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Weekly evaluations</div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
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
        </nav>

        <div className="p-4 border-t">
          <div className="rounded-lg bg-brand text-brand-foreground p-4">
            <div className="text-xs font-semibold opacity-90">Bootcamp Week</div>
            <div className="text-3xl font-bold mt-1">{CURRENT_WEEK} / {TOTAL_WEEKS}</div>
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
          <img src="/image-1784557444135.png" alt="Code Campus International" className="h-10 w-auto max-w-full" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
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
        </nav>

        <div className="p-4 border-t">
          <div className="rounded-lg bg-brand text-brand-foreground p-4">
            <div className="text-xs font-semibold opacity-90">Bootcamp Week</div>
            <div className="text-3xl font-bold mt-1">{CURRENT_WEEK} / {TOTAL_WEEKS}</div>
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
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students… (press Enter)"
              className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
          <button className="relative h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-brand rounded-full" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-semibold">
              MS
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium leading-tight">Mentor Sarah</div>
              <div className="text-xs text-muted-foreground">Admin</div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
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
