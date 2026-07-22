import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronRight, UserPlus } from "lucide-react";
import { useState, useMemo } from "react";
import { studentStats, TRACKS } from "@/lib/tracking";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/mentor/students")({
  head: () => ({
    meta: [{ title: "Students — CodeCampus Excellence Tracker" }],
  }),
  component: StudentsList,
});

function StudentsList() {
  const { evaluations, students, refresh } = useStore();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    setPage(1); // reset page on search
    return students.map((s) => ({ ...s, stats: studentStats(s.id, evaluations) })).filter((s) =>
      (s.name + s.track + (s.email ?? "")).toLowerCase().includes(q.toLowerCase()),
    ).map((s, _, arr) => {
      const ranked = [...arr].filter((x) => x.stats.count > 0).sort((a, b) => b.stats.avg - a.stats.avg);
      return {
        ...s,
        rank: s.stats.count > 0 ? ranked.findIndex((r) => r.id === s.id) + 1 : null,
        total: ranked.filter((r) => r.stats.count > 0).length,
      };
    });
  }, [q, evaluations, students]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", track: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const totalPages = Math.ceil(rows.length / PER_PAGE);
  const pagedRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Please enter the student's full name"); return; }
    if (!form.email.trim()) { toast.error("Please enter the student's email"); return; }
    if (!form.track) { toast.error("Please select a track"); return; }
    setSaving(true);
    try {
      await api.post("/api/students/enroll", form);
      toast.success(`${form.name} added — welcome email sent`);
      setDialogOpen(false);
      setForm({ name: "", email: "", track: "" });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Students"
        subtitle={`${students.length} students enrolled in the current cohort.`}
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-brand text-brand-foreground hover:bg-brand/90">
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Full Name</Label>
              <Input placeholder="enter full name" value={form.name}
                onChange={(e) => set("name")(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input type="email" placeholder="enter email address" value={form.email}
                onChange={(e) => set("email")(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Track</Label>
              <Select value={form.track} onValueChange={set("track")}>
                <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                <SelectContent>
                  {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              A welcome email with login credentials will be sent to the student.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}
              className="bg-brand text-brand-foreground hover:bg-brand/90">
              <UserPlus className="h-4 w-4" />
              {saving ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          {pagedRows.map((s) => (
            <Link
              key={s.id}
              to="/mentor/students/$id"
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
              {s.rank !== null && (
                <div className="hidden sm:block text-right">
                  <div className="text-xs text-muted-foreground">Rank</div>
                  <div className="font-semibold text-brand">#{s.rank}</div>
                </div>
              )}
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
      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        totalItems={rows.length}
        perPage={PER_PAGE}
      />
    </AppShell>
  );
}
