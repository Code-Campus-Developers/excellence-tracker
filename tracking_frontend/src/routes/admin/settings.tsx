import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Trash2, CalendarOff } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useStore, getCurrentWeek } from "@/lib/store";
import { TRACKS } from "@/lib/tracking";
import { GradingScale } from "@/components/GradingScale";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings | CodeCampus" }] }),
  component: AdminSettings,
});

function AdminSettings() {
  const { settings, updateSettings } = useStore();
  const [grades, setGrades] = useState({
    excellent: String(settings.grade_excellent),
    good: String(settings.grade_good),
    needs: String(settings.grade_needs),
  });
  const [totalWeeks, setTotalWeeks] = useState(String(settings.total_weeks));
  const [cohortName, setCohortName] = useState(settings.cohort_name);
  const [cohortStartDate, setCohortStartDate] = useState(settings.cohort_start_date);
  const [weekOverride, setWeekOverride] = useState(
    settings.current_week_override ? String(settings.current_week_override) : ""
  );
  const [trackWeeks, setTrackWeeks] = useState<Record<string, string>>(
    Object.fromEntries(TRACKS.map((t) => [t, String(settings.track_weeks[t] ?? 1)]))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validate
    const exc = Number(grades.excellent);
    const good = Number(grades.good);
    const needs = Number(grades.needs);
    const total = Number(totalWeeks);

    if (exc <= good || good <= needs) {
      toast.error("Grade thresholds must be: Excellent > Good > Needs Improvement");
      return;
    }
    if (total < 1 || total > 52) {
      toast.error("Total weeks must be between 1 and 52");
      return;
    }

    const trackWeeksNum: Record<string, number> = {};
    for (const [track, val] of Object.entries(trackWeeks)) {
      const n = Number(val);
      if (n < 1 || n > total) {
        toast.error(`Week for "${track}" must be between 1 and ${total}`);
        return;
      }
      trackWeeksNum[track] = n;
    }

    setSaving(true);
    try {
      await api.put("/admin/settings", {
        grade_excellent: grades.excellent,
        grade_good: grades.good,
        grade_needs: grades.needs,
        total_weeks: totalWeeks,
        track_weeks: JSON.stringify(trackWeeksNum),
        cohort_name: cohortName,
        cohort_start_date: cohortStartDate,
        current_week_override: weekOverride ? weekOverride : "",
      });

      updateSettings({
        grade_excellent: exc,
        grade_good: good,
        grade_needs: needs,
        total_weeks: total,
        track_weeks: trackWeeksNum,
        cohort_name: cohortName,
        cohort_start_date: cohortStartDate,
        current_week_override: weekOverride ? Number(weekOverride) : null,
      });

      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Configure grading thresholds and current week per track."
        actions={
          <Button onClick={handleSave} disabled={saving}
            className="bg-brand text-brand-foreground hover:bg-brand/90">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        }
      />

      {/* Bootcamp Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Bootcamp Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Set the bootcamp start date. The current week is auto-calculated from the start date
            — or you can override it manually below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Start Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input type="date" value={cohortStartDate}
                onChange={(e) => setCohortStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">
                Global Week Override
                <span className="text-muted-foreground text-xs ml-1">(leave blank to auto-calculate)</span>
              </Label>
              <Input
                type="number" min={1} max={Number(totalWeeks) || 52}
                placeholder={`Auto: Week ${getCurrentWeek(settings)}`}
                value={weekOverride}
                onChange={(e) => setWeekOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-calculated: <strong>Week {getCurrentWeek(settings)}</strong>
                {settings.cohort_start_date ? ` (from cohort start date)` : ` (no start date set)`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Thresholds */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Grade Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Set the minimum score required for each performance level. Must be Excellent &gt; Good &gt; Needs Improvement.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="mb-1.5 block text-green-700">Excellent (min score)</Label>
              <Input type="number" min={1} max={100} value={grades.excellent}
                onChange={(e) => setGrades((p) => ({ ...p, excellent: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block text-blue-700">Good (min score)</Label>
              <Input type="number" min={1} max={100} value={grades.good}
                onChange={(e) => setGrades((p) => ({ ...p, good: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block text-yellow-700">Needs Improvement (min score)</Label>
              <Input type="number" min={1} max={100} value={grades.needs}
                onChange={(e) => setGrades((p) => ({ ...p, needs: e.target.value }))} />
            </div>
          </div>
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Preview with current values:</p>
            <GradingScale compact />
          </div>
        </CardContent>
      </Card>

      {/* Total Weeks */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Bootcamp Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label className="mb-1.5 block">Total Weeks</Label>
            <Input type="number" min={1} max={52} value={totalWeeks}
              onChange={(e) => setTotalWeeks(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Per-track current week */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Week per Track</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-4">
            <strong>Use this when tracks are on different weeks.</strong> For example, if Software Engineering
            is on Week 6 but Data Analytics is still on Week 4. If all tracks move together,
            use the <strong>Global Week Override</strong> above instead | it's simpler.
            Each instructor can also update their own track's week from their Settings page.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRACKS.map((track) => (
              <div key={track}>
                <Label className="mb-1.5 block text-sm">{track}</Label>
                <Input
                  type="number"
                  min={1}
                  max={Number(totalWeeks) || 16}
                  value={trackWeeks[track] ?? "1"}
                  onChange={(e) => setTrackWeeks((p) => ({ ...p, [track]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Holidays ── */}
      <HolidaysCard />
    </AppShell>
  );
}

interface Holiday { id: string; date: string; name: string; }

function HolidaysCard() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Holiday[]>("/api/settings/holidays").then(setHolidays).catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) { toast.error("Date and name are required"); return; }
    setSaving(true);
    try {
      const h = await api.post<Holiday>("/api/settings/holidays", { date: newDate, name: newName.trim() });
      setHolidays((prev) => [...prev, h].sort((a, b) => a.date.localeCompare(b.date)));
      setNewDate(""); setNewName("");
      toast.success("Holiday added");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/api/settings/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      toast.success("Holiday removed");
    } catch { toast.error("Failed to remove holiday"); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarOff className="h-4 w-4 text-brand" /> Holidays</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Dates added here will be skipped by the missed attendance email cron (Mon–Fri 4 PM).</p>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs mb-1 block">Date</Label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9 w-40" required />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs mb-1 block">Holiday Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Eid el-Fitr" className="h-9" required />
          </div>
          <Button type="submit" disabled={saving} size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
            {saving ? "Adding…" : "Add Holiday"}
          </Button>
        </form>
        {holidays.length > 0 && (
          <div className="divide-y border rounded-md">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <button onClick={() => handleDelete(h.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-4">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {holidays.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No holidays added yet.</p>}
      </CardContent>
    </Card>
  );
}
