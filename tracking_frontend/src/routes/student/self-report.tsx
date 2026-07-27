import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Linkedin, BookOpen, Code2, Calendar, CheckCircle2,
  Clock, XCircle, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { StudentShell } from "@/components/StudentShell";

export const Route = createFileRoute("/student/self-report")({
  head: () => ({ meta: [{ title: "Self-Report | CodeCampus" }] }),
  component: StudentSelfReport,
});

interface SelfReport {
  id: string; weekNumber: number; cohortYear: number;
  linkedinDone: boolean; linkedinUrl: string | null;
  learningLogDone: boolean; learningLogUrl: string | null;
  codingDone: boolean; codingUrl: string | null;
  eventDone: boolean; eventUrl: string | null;
  notes: string | null; status: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string; updatedAt: string;
}

interface FormState {
  linkedinDone: boolean; linkedinUrl: string;
  learningLogDone: boolean; learningLogUrl: string;
  codingDone: boolean; codingUrl: string;
  eventDone: boolean; eventUrl: string;
  notes: string;
}
const EMPTY: FormState = {
  linkedinDone: false, linkedinUrl: "",
  learningLogDone: false, learningLogUrl: "",
  codingDone: false, codingUrl: "",
  eventDone: false, eventUrl: "",
  notes: "",
};

function StatusBadge({ status }: { status: SelfReport["status"] }) {
  if (status === "VERIFIED") return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Verified</Badge>;
  if (status === "REJECTED") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock className="h-3 w-3" />Pending review</Badge>;
}

function ActivityRow({ icon, label, description, doneKey, urlKey, placeholder, form, setForm }: {
  icon: React.ReactNode; label: string; description: string;
  doneKey: keyof Pick<FormState,"linkedinDone"|"learningLogDone"|"codingDone"|"eventDone">;
  urlKey: keyof Pick<FormState,"linkedinUrl"|"learningLogUrl"|"codingUrl"|"eventUrl">;
  placeholder: string; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="flex flex-col gap-2 py-4 border-b last:border-0">
      <div className="flex items-start gap-3">
        <Checkbox id={doneKey} checked={form[doneKey]}
          onCheckedChange={(c) => setForm((p) => ({ ...p, [doneKey]: c === true }))} className="mt-0.5" />
        <label htmlFor={doneKey} className="cursor-pointer flex-1">
          <div className="flex items-center gap-2 font-medium text-sm">{icon}{label}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </label>
      </div>
      {form[doneKey] && (
        <div className="ml-7">
          <Input placeholder={placeholder} value={form[urlKey]}
            onChange={(e) => setForm((p) => ({ ...p, [urlKey]: e.target.value }))} className="text-sm" />
        </div>
      )}
    </div>
  );
}

function PastReport({ report, onEdit }: { report: SelfReport; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const done = [report.linkedinDone && "LinkedIn", report.learningLogDone && "Learning Log", report.codingDone && "Coding", report.eventDone && "Event"].filter(Boolean) as string[];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div><span className="font-semibold text-sm">Week {report.weekNumber}</span><span className="text-xs text-muted-foreground ml-2">{report.cohortYear}</span></div>
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} />
            {report.status === "PENDING" && <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>}
            <button onClick={() => setExpanded((p) => !p)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {done.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{done.map((d) => <span key={d} className="text-[10px] font-medium bg-brand-soft text-brand px-2 py-0.5 rounded-full">✓ {d}</span>)}</div>}
        {expanded && (
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {report.linkedinDone && report.linkedinUrl && <a href={report.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate"><Linkedin className="h-3 w-3 shrink-0" />{report.linkedinUrl}</a>}
            {report.learningLogDone && report.learningLogUrl && <a href={report.learningLogUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate"><BookOpen className="h-3 w-3 shrink-0" />{report.learningLogUrl}</a>}
            {report.codingDone && report.codingUrl && <a href={report.codingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate"><Code2 className="h-3 w-3 shrink-0" />{report.codingUrl}</a>}
            {report.eventDone && report.eventUrl && <a href={report.eventUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate"><Calendar className="h-3 w-3 shrink-0" />{report.eventUrl}</a>}
            {report.notes && <p className="mt-1 italic">"{report.notes}"</p>}
            <p className="mt-1">Submitted {new Date(report.submittedAt).toLocaleDateString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudentSelfReport() {
  const { settings } = useStore();
  const totalWeeks = settings?.total_weeks ?? 12;
  const cohortYear = new Date().getFullYear();

  const [reports, setReports] = useState<SelfReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    try { setReports((await api.get<SelfReport[]>("/api/self-reports/me")) ?? []); }
    catch { toast.error("Failed to load reports"); }
    finally { setLoadingReports(false); }
  }, []);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    const existing = reports.find((r) => r.weekNumber === selectedWeek && r.cohortYear === cohortYear);
    setForm(existing ? {
      linkedinDone: existing.linkedinDone, linkedinUrl: existing.linkedinUrl ?? "",
      learningLogDone: existing.learningLogDone, learningLogUrl: existing.learningLogUrl ?? "",
      codingDone: existing.codingDone, codingUrl: existing.codingUrl ?? "",
      eventDone: existing.eventDone, eventUrl: existing.eventUrl ?? "",
      notes: existing.notes ?? "",
    } : EMPTY);
  }, [selectedWeek, reports, cohortYear]);

  const existing = reports.find((r) => r.weekNumber === selectedWeek && r.cohortYear === cohortYear);
  const isVerified = existing?.status === "VERIFIED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/api/self-reports", { weekNumber: selectedWeek, cohortYear, ...form, linkedinUrl: form.linkedinUrl || null, learningLogUrl: form.learningLogUrl || null, codingUrl: form.codingUrl || null, eventUrl: form.eventUrl || null, notes: form.notes || null });
      toast.success(`Week ${selectedWeek} report submitted!`);
      await fetchReports();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to submit"); }
    finally { setSaving(false); }
  };

  return (
    <StudentShell title="Self-Report">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg">Weekly Self-Report</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Week</Label>
                <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {existing && <div className="flex items-center gap-2 mt-1"><StatusBadge status={existing.status} />{isVerified && <span className="text-xs text-muted-foreground">Verified | editing locked</span>}</div>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <p className="text-xs text-muted-foreground mb-4">Check each activity you completed this week and paste the proof link.</p>
              <ActivityRow icon={<Linkedin className="h-4 w-4 text-[#0077b5]" />} label="LinkedIn Post" description="Share a post about your learning journey, projects, or tech insights." doneKey="linkedinDone" urlKey="linkedinUrl" placeholder="https://linkedin.com/posts/..." form={form} setForm={setForm} />
              <ActivityRow icon={<BookOpen className="h-4 w-4 text-amber-600" />} label="Learning Log" description="Document what you learned this week." doneKey="learningLogDone" urlKey="learningLogUrl" placeholder="https://notion.so/..." form={form} setForm={setForm} />
              <ActivityRow icon={<Code2 className="h-4 w-4 text-violet-600" />} label="Coding Activity" description="GitHub contribution, project commit, or coding challenge." doneKey="codingDone" urlKey="codingUrl" placeholder="https://github.com/..." form={form} setForm={setForm} />
              <ActivityRow icon={<Calendar className="h-4 w-4 text-brand" />} label="Event / Workshop" description="Meetup, webinar, hackathon, or tech community event." doneKey="eventDone" urlKey="eventUrl" placeholder="https://eventbrite.com/..." form={form} setForm={setForm} />
              <div className="mt-4">
                <Label className="mb-1.5 block text-sm">Notes (optional)</Label>
                <Textarea placeholder="Anything else for your instructor..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} disabled={isVerified} />
              </div>
              <Button type="submit" className="w-full mt-5 bg-brand text-brand-foreground hover:bg-brand/90" disabled={saving || isVerified}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</> : existing ? "Update Report" : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loadingReports ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : reports.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Submission History</h2>
            <div className="space-y-3">{reports.map((r) => <PastReport key={r.id} report={r} onEdit={() => setSelectedWeek(r.weekNumber)} />)}</div>
          </div>
        ) : null}
      </div>
    </StudentShell>
  );
}
