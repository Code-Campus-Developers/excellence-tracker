import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { TRACKS } from "@/lib/tracking";
import { GradingScale } from "@/components/GradingScale";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — CodeCampus" }] }),
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
      });

      updateSettings({
        grade_excellent: exc,
        grade_good: good,
        grade_needs: needs,
        total_weeks: total,
        track_weeks: trackWeeksNum,
        cohort_name: cohortName,
        cohort_start_date: cohortStartDate,
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

      {/* Cohort Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Cohort Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Cohort Name</Label>
              <Input placeholder="e.g. Cohort 3" value={cohortName}
                onChange={(e) => setCohortName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Start Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input type="date" value={cohortStartDate}
                onChange={(e) => setCohortStartDate(e.target.value)} />
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
          <p className="text-sm text-muted-foreground mb-4">
            Set the current bootcamp week for each track independently. This controls which week shows as "current" for students and mentors in that track.
          </p>
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
    </AppShell>
  );
}
