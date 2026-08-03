import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Linkedin, BookOpen, Code2, Calendar, CheckCircle2,
  Clock, XCircle, ChevronDown, ChevronUp, Loader2, ImagePlus, X, PenLine,
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
  eventImage1: string | null; eventImage2: string | null;
  notes: string | null; status: "PENDING" | "VERIFIED" | "REJECTED";
  editRequested: boolean;
  submittedAt: string; updatedAt: string;
}

interface FormState {
  linkedinDone: boolean; linkedinUrl: string;
  learningLogDone: boolean; learningLogUrl: string;
  codingDone: boolean; codingUrl: string;
  eventDone: boolean; eventUrl: string;
  eventImage1: string; eventImage2: string;
  notes: string;
}
const EMPTY: FormState = {
  linkedinDone: false, linkedinUrl: "",
  learningLogDone: false, learningLogUrl: "",
  codingDone: false, codingUrl: "",
  eventDone: false, eventUrl: "",
  eventImage1: "", eventImage2: "",
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

function PastReport({ report, onEdit, onRequestEdit }: { report: SelfReport; onEdit: () => void; onRequestEdit: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const done = [report.linkedinDone && "LinkedIn", report.learningLogDone && "Learning Log", report.codingDone && "Coding", report.eventDone && "Event"].filter(Boolean) as string[];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div><span className="font-semibold text-sm">Week {report.weekNumber}</span><span className="text-xs text-muted-foreground ml-2">{report.cohortYear}</span></div>
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} />
            {report.editRequested && <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-[10px]"><Clock className="h-3 w-3" />Edit Pending Approval</Badge>}
            {report.status === "PENDING" && <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>}
            {report.status === "VERIFIED" && !report.editRequested && (
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => onRequestEdit(report.id)}>
                <PenLine className="h-3 w-3" />Request Edit
              </Button>
            )}
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

// ─── Event row with photo upload ─────────────────────────────────────────────
function EventRow({ form, setForm, disabled }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; disabled?: boolean }) {
  const [uploading, setUploading] = useState<1 | 2 | null>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, slot: 1 | 2) => {
    setUploading(slot);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
      const token = (() => { try { const r = localStorage.getItem("excellence_auth"); return r ? (JSON.parse(r) as { token: string }).token : null; } catch { return null; } })();
      const res = await fetch(`${BASE}/api/upload/profile-picture`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setForm((p) => ({ ...p, [`eventImage${slot}`]: url }));
      toast.success(`Photo ${slot} uploaded`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(null); }
  };

  const ImageSlot = ({ slot, ref: imgRef }: { slot: 1 | 2; ref: React.RefObject<HTMLInputElement | null> }) => {
    const url = slot === 1 ? form.eventImage1 : form.eventImage2;
    return (
      <div>
        {url ? (
          <div className="relative inline-block">
            <img src={url} alt={`Event photo ${slot}`} className="h-20 w-20 rounded-lg object-cover border-2 border-brand" />
            {!disabled && (
              <button type="button" onClick={() => setForm((p) => ({ ...p, [`eventImage${slot}`]: "" }))}
                className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <button type="button" disabled={disabled || uploading !== null}
            onClick={() => imgRef.current?.click()}
            className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-brand flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-brand transition-colors disabled:opacity-50">
            {uploading === slot ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px]">Photo {slot}</span>
          </button>
        )}
        <input ref={imgRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, slot); }} />
      </div>
    );
  };

  const ref1Ref = useRef<HTMLInputElement>(null);
  const ref2Ref = useRef<HTMLInputElement>(null);
  const ref3Ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2 py-4 border-b last:border-0">
      <div className="flex items-start gap-3">
        <Checkbox id="eventDone" checked={form.eventDone}
          onCheckedChange={(c) => setForm((p) => ({ ...p, eventDone: c === true }))} className="mt-0.5" />
        <label htmlFor="eventDone" className="cursor-pointer flex-1">
          <div className="flex items-center gap-2 font-medium text-sm"><Calendar className="h-4 w-4 text-brand" />Event / Workshop</div>
          <p className="text-xs text-muted-foreground mt-0.5">Meetup, webinar, hackathon, or tech community event. Upload up to 2 proof photos.</p>
        </label>
      </div>
      {form.eventDone && (
        <div className="ml-7 space-y-2">
          <Input placeholder="Event URL (optional — https://eventbrite.com/...)" value={form.eventUrl}
            onChange={(e) => setForm((p) => ({ ...p, eventUrl: e.target.value }))} className="text-sm" disabled={disabled} />
          <div className="flex gap-3">
            <ImageSlot slot={1} ref={ref1Ref} />
            <ImageSlot slot={2} ref={ref2Ref} />
            {!form.eventImage1 && !form.eventImage2 && (
              <p className="text-xs text-muted-foreground self-center">Upload proof photos (max 2)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Daily Event Section ─────────────────────────────────────────────────────
interface DailyEventRecord { id: string; date: string; description: string | null; image1: string | null; image2: string | null; }

function DailyEventSection() {
  const [today, setToday] = useState<DailyEventRecord | null | undefined>(undefined);
  const [history, setHistory] = useState<DailyEventRecord[]>([]);
  const [desc, setDesc] = useState("");
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [image3, setImage3] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<1 | 2 | null>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<DailyEventRecord | null>("/api/daily-events/today").then((d) => {
      setToday(d);
      if (d) { setDesc(d.description ?? ""); setImage1(d.image1 ?? ""); setImage2(d.image2 ?? ""); setImage3((d as any).image3 ?? ""); }
    }).catch(() => setToday(null));
    api.get<DailyEventRecord[]>("/api/daily-events/me").then((d) => setHistory(d ?? [])).catch(() => {});
  }, []);

  const uploadPhoto = async (file: File, slot: 1 | 2 | 3) => {
    setUploading(slot);
    try {
      const fd = new FormData(); fd.append("file", file);
      const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
      const token = (() => { try { const r = localStorage.getItem("excellence_auth"); return r ? (JSON.parse(r) as { token: string }).token : null; } catch { return null; } })();
      const res = await fetch(`${BASE}/api/upload/profile-picture`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      if (slot === 1) setImage1(url); else if (slot === 2) setImage2(url); else setImage3(url);
      toast.success(`Photo ${slot} uploaded`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api.post<DailyEventRecord>("/api/daily-events", {
        description: desc || null, image1: image1 || null, image2: image2 || null, image3: image3 || null,
      });
      setToday(result);
      setHistory((prev) => {
        const filtered = prev.filter((r) => r.date.slice(0,10) !== result.date.slice(0,10));
        return [result, ...filtered];
      });
      toast.success("Daily event saved!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const ImageSlot = ({ slot, imgRef }: { slot: 1 | 2 | 3; imgRef: React.RefObject<HTMLInputElement | null> }) => {
    const url = slot === 1 ? image1 : slot === 2 ? image2 : image3;
    return (
      <div>
        {url ? (
          <div className="relative inline-block">
            <img src={url} alt={`Photo ${slot}`} className="h-20 w-20 rounded-lg object-cover border-2 border-brand" />
            <button type="button" onClick={() => slot === 1 ? setImage1("") : slot === 2 ? setImage2("") : setImage3("")}
              className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button type="button" disabled={uploading !== null} onClick={() => imgRef.current?.click()}
            className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-brand flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-brand disabled:opacity-50">
            {uploading === slot ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px]">Photo {slot}</span>
          </button>
        )}
        <input ref={imgRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, slot as 1 | 2 | 3); }} />
      </div>
    );
  };

  const ref1Ref = useRef<HTMLInputElement>(null);
  const ref2Ref = useRef<HTMLInputElement>(null);
  const ref3Ref = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand" /> Daily Event / Workshop
        </CardTitle>
        <p className="text-xs text-muted-foreground">Log any event, meetup, webinar, or workshop you attended today. Upload up to 3 proof photos.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">What did you attend today?</Label>
            <Input placeholder="e.g. Attended a webinar on React..." value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <ImageSlot slot={1} imgRef={ref1Ref} />
            <ImageSlot slot={2} imgRef={ref2Ref} />
            <ImageSlot slot={3} imgRef={ref3Ref} />
            <p className="text-xs text-muted-foreground">Upload up to 3 proof photos</p>
          </div>
          <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : today ? "Update Today's Event" : "Log Today's Event"}
          </Button>
        </form>

        {history.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Event History</p>
            <div className="space-y-2">
              {history.map((e) => (
                <div key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{new Date(e.date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                  <div className="flex-1 min-w-0">
                    {e.description && <p className="truncate">{e.description}</p>}
                    {(e.image1 || e.image2 || (e as any).image3) && (
                      <div className="flex gap-2 mt-1">
                        {e.image1 && <a href={e.image1} target="_blank" rel="noreferrer"><img src={e.image1} alt="proof 1" className="h-12 w-12 rounded object-cover border hover:opacity-90" /></a>}
                        {e.image2 && <a href={e.image2} target="_blank" rel="noreferrer"><img src={e.image2} alt="proof 2" className="h-12 w-12 rounded object-cover border hover:opacity-90" /></a>}
                        {(e as any).image3 && <a href={(e as any).image3} target="_blank" rel="noreferrer"><img src={(e as any).image3} alt="proof 3" className="h-12 w-12 rounded object-cover border hover:opacity-90" /></a>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
  const [requestingEdit, setRequestingEdit] = useState<string | null>(null);

  const handleRequestEdit = async (id: string) => {
    setRequestingEdit(id);
    try {
      await api.patch(`/api/self-reports/${id}/request-edit`, {});
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, editRequested: true } : r));
      toast.success("Edit request sent to your instructor!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setRequestingEdit(null); }
  };

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
      eventImage1: existing.eventImage1 ?? "", eventImage2: existing.eventImage2 ?? "",
      notes: existing.notes ?? "",
    } : EMPTY);
  }, [selectedWeek, reports, cohortYear]);

  const existing = reports.find((r) => r.weekNumber === selectedWeek && r.cohortYear === cohortYear);
  const isVerified = existing?.status === "VERIFIED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/api/self-reports", { weekNumber: selectedWeek, cohortYear, ...form, linkedinUrl: form.linkedinUrl || null, learningLogUrl: form.learningLogUrl || null, codingUrl: form.codingUrl || null, eventUrl: form.eventUrl || null, eventImage1: form.eventImage1 || null, eventImage2: form.eventImage2 || null, notes: form.notes || null });
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

        {/* Daily Events — separate from weekly self-report */}
        <DailyEventSection />

        {loadingReports ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : reports.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Submission History</h2>
            <div className="space-y-3">{reports.map((r) => <PastReport key={r.id} report={r} onEdit={() => setSelectedWeek(r.weekNumber)} onRequestEdit={handleRequestEdit} />)}</div>
          </div>
        ) : null}
      </div>
    </StudentShell>
  );
}
