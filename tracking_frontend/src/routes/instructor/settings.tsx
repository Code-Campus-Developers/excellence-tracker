import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useStore, getCurrentWeek } from "@/lib/store";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/instructor/settings")({
  head: () => ({ meta: [{ title: "Settings | CodeCampus" }] }),
  component: InstructorSettings,
});

function InstructorSettings() {
  const { settings, updateSettings } = useStore();
  const { user } = useAuth();
  const myTrack = user?.track ?? null;

  const [cohortName, setCohortName] = useState(settings.cohort_name);
  const [cohortStartDate, setCohortStartDate] = useState(settings.cohort_start_date);
  const [totalWeeks, setTotalWeeks] = useState(String(settings.total_weeks));
  const [weekOverride, setWeekOverride] = useState(
    settings.current_week_override ? String(settings.current_week_override) : ""
  );
  // Per-track: only the instructor's own track
  const [myTrackWeek, setMyTrackWeek] = useState(
    myTrack ? String(settings.track_weeks[myTrack] ?? getCurrentWeek(settings)) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const total = Number(totalWeeks);
    if (total < 1 || total > 52) { toast.error("Total weeks must be between 1 and 52"); return; }
    if (weekOverride && (Number(weekOverride) < 1 || Number(weekOverride) > total)) {
      toast.error(`Week override must be between 1 and ${total}`); return;
    }

    // Build updated track_weeks: keep all existing, only override own track
    const updatedTrackWeeks = { ...settings.track_weeks };
    if (myTrack && myTrackWeek) {
      updatedTrackWeeks[myTrack] = Number(myTrackWeek);
    }

    setSaving(true);
    try {
      await api.put("/api/settings", {
        cohort_name: cohortName,
        cohort_start_date: cohortStartDate,
        total_weeks: totalWeeks,
        current_week_override: weekOverride ? weekOverride : "",
        track_weeks: JSON.stringify(updatedTrackWeeks),
      });

      updateSettings({
        ...settings,
        cohort_name: cohortName,
        cohort_start_date: cohortStartDate,
        total_weeks: total,
        current_week_override: weekOverride ? Number(weekOverride) : null,
        track_weeks: updatedTrackWeeks,
      });

      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const autoWeek = getCurrentWeek(settings);

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Configure cohort info and current week."
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
          <p className="text-sm text-muted-foreground mb-4">
            Set the cohort name and start date. The current week is auto-calculated from
            the start date | or you can override it manually below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Cohort Name</Label>
              <Input placeholder="e.g. Cohort 3" value={cohortName}
                onChange={(e) => setCohortName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Start Date
                <span className="text-muted-foreground text-xs ml-1">(auto-calculates week)</span>
              </Label>
              <Input type="date" value={cohortStartDate}
                onChange={(e) => setCohortStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Total Weeks</Label>
              <Input type="number" min={1} max={52} value={totalWeeks}
                onChange={(e) => setTotalWeeks(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Current Week */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Global Week Override</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Use this when <strong>all tracks are on the same week</strong>. Leave blank to let the system
            auto-calculate from the cohort start date. This affects all dashboards, evaluate
            form defaults, and stats cards.
          </p>
          <div className="max-w-xs">
            <Label className="mb-1.5 block">
              Override Week
              <span className="text-muted-foreground text-xs ml-1">(optional | blank = auto)</span>
            </Label>
            <Input
              type="number" min={1} max={Number(totalWeeks) || 52}
              placeholder={`Auto: Week ${autoWeek}`}
              value={weekOverride}
              onChange={(e) => setWeekOverride(e.target.value)}
            />
          </div>
          <div className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auto-calculated:</span>
              <span className="font-bold text-brand">Week {autoWeek}</span>
            </div>
            <div className="flex items-center justify-between mt-1 font-semibold">
              <span className="text-muted-foreground">Effective current week:</span>
              <span>Week {weekOverride || autoWeek}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Track Week */}
      {myTrack && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Track Week | {myTrack}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use this when your track is on a <strong>different week</strong> from the global setting.
              Only affects your track ({myTrack}). Leave it matching the global week if your
              track moves with everyone else.
            </p>
            <div className="max-w-xs">
              <Label className="mb-1.5 block">{myTrack} | Current Week</Label>
              <Input
                type="number" min={1} max={Number(totalWeeks) || 52}
                placeholder={`Global: Week ${weekOverride || autoWeek}`}
                value={myTrackWeek}
                onChange={(e) => setMyTrackWeek(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {!myTrack && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No track assigned to your account. Ask an admin to set your track so you can
            manage your track's week independently.
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
