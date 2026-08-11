import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, Trophy, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOTAL_WEEKS } from "@/lib/tracking";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { user?: { role?: string } };
      const role = parsed?.user?.role;
      if (!role) return;
      throw redirect({
        to: role === "ADMIN" ? "/admin"
          : role === "MENTOR" ? "/instructor"
          : role === "PARENT" ? "/parent"
          : "/student",
      });
    } catch (e) {
      // re-throw redirects; swallow JSON parse / missing data errors
      if (e && typeof e === "object" && "to" in (e as Record<string, unknown>)) throw e;
    }
  },
  head: () => ({
    meta: [
      { title: "Code Campus Excellence Tracker" },
      { name: "description", content: "Track weekly student performance across the Code Campus International Software Engineering Bootcamp." },
    ],
  }),
  component: Landing,
});

function Landing() {

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur w-full">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between w-full">
        <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus International" className="h-16 w-auto" />
        <Link to="/login">
          <Button variant="outline" size="sm">Sign In</Button>
        </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <img
          src="/image-1784711136503.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          aria-hidden="true"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content */}
        <div className="relative max-w-4xl mx-auto px-4 md:px-8 pt-24 pb-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Track. Evaluate.<br />
            <span className="text-[color:var(--brand)]">Excel.</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
            The official performance tracking platform for <strong className="text-white">Code Campus International</strong>.
            Weekly evaluations, live dashboards, and personalised score reports for every student.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand)]/90 px-8">
                Register as Student
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="px-8 bg-white/10 text-white border-white/30 hover:bg-white/20">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-white/60 text-sm">
            Are you a parent?{" "}
            <Link to="/parent-login" className="text-white underline underline-offset-4 hover:text-white/80 transition-colors">
              Access Parent Portal →
            </Link>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/40 py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl font-bold text-center mb-12">Everything you need to track excellence</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: ClipboardCheck, title: "Weekly Evaluations", desc: "Instructors score students across 7 categories every week, attendance, projects, coding, and more." },
              { icon: BarChart3, title: "Live Dashboards", desc: "Real-time charts showing score trends, category breakdowns, and progress over 16 weeks." },
              { icon: Trophy, title: "Leaderboard", desc: "See where you rank against your peers. Updated after every evaluation." },
              { icon: Users, title: "Student Portal", desc: "Every student gets a personal dashboard with their scores, instructor feedback, and class comparison." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 border">
                <div className="h-10 w-10 rounded-lg bg-[oklch(0.97_0.03_145)] flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-[color:var(--brand)]" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-4">How scoring works</h2>
        <p className="text-center text-gray-500 mb-10">Students are evaluated weekly across 7 categories, 100 points total.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Attendance", pts: 25 },
            { label: "Project", pts: 20 },
            { label: "Coding", pts: 20 },
            { label: "LinkedIn & X", pts: 10 },
            { label: "Teamwork", pts: 10 },
            { label: "Learning Logs", pts: 10 },
            { label: "Housekeeping", pts: 5 },
          ].map(({ label, pts }) => (
            <div key={label} className="border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[color:var(--brand)]">{pts}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
          <div className="border-2 border-[color:var(--brand)] rounded-xl p-4 text-center bg-[oklch(0.97_0.03_145)]">
            <div className="text-2xl font-bold text-[color:var(--brand)]">100</div>
            <div className="text-xs text-gray-700 mt-1 font-semibold">Total</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[color:var(--brand)] py-16 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">Join the Code Campus bootcamp tracking system and take control of your learning journey.</p>
        <Link to="/register">
          <Button size="lg" className="bg-white text-[color:var(--brand)] hover:bg-white/90 px-10 font-semibold">
            Create Your Account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Code Campus International. All rights reserved.
      </footer>
    </div>
  );
}
