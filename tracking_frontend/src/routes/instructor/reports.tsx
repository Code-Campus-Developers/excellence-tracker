import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Clock, XCircle, ExternalLink, Linkedin, BookOpen, Code2, Calendar, PenLine, RefreshCw } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/instructor/reports")({
  head: () => ({ meta: [{ title: "Self-Reports | CodeCampus" }] }),
  component: InstructorReports,
});

interface Report {
  id: string; weekNumber: number; cohortYear: number; status: "PENDING" | "VERIFIED" | "REJECTED";
  linkedinDone: boolean; linkedinUrl: string | null;
  learningLogDone: boolean; learningLogUrl: string | null;
  codingDone: boolean; codingUrl: string | null;
  eventDone: boolean; eventUrl: string | null;
  eventImage1: string | null; eventImage2: string | null;
  notes: string | null; editRequested: boolean; submittedAt: string;
  student: { id: string; name: string; track: string; studentCode?: string };
}

function StatusBadge({ s }: { s: Report["status"] }) {
  if (s === "VERIFIED") return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" />Verified</Badge>;
  if (s === "REJECTED") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-[10px]"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-[10px]"><Clock className="h-3 w-3" />Pending</Badge>;
}

interface DailyEvent {
  id: string; date: string; description: string | null; image1: string | null; image2: string | null;
  student: { id: string; name: string; track: string; studentCode?: string };
}

function InstructorReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekFilter, setWeekFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reports" | "daily-events">("reports");
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);

  const fetchAll = () => {
    setLoading(true); setDailyLoading(true);
    api.get<Report[]>("/api/self-reports/all")
      .then((d) => setReports(d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get<DailyEvent[]>("/api/daily-events/all")
      .then((d) => setDailyEvents(d ?? []))
      .catch(() => {})
      .finally(() => setDailyLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleVerify = async (id: string, status: "VERIFIED" | "REJECTED") => {
    setVerifying(id);
    try {
      const updated = await api.patch<Report>(`/api/self-reports/${id}/verify`, { status });
      setReports((prev) => prev.map((r) => r.id === updated.id ? { ...r, status: updated.status } : r));
      toast.success(status === "VERIFIED" ? "Report verified!" : "Report rejected");
    } catch { toast.error("Failed to update report"); }
    finally { setVerifying(null); }
  };

  const [approvingEdit, setApprovingEdit] = useState<string | null>(null);
  const handleApproveEdit = async (id: string, approved: boolean) => {
    setApprovingEdit(id);
    try {
      const updated = await api.patch<{ id: string; status: string; editRequested: boolean }>(`/api/self-reports/${id}/approve-edit`, { approved });
      setReports((prev) => prev.map((r) => r.id === updated.id ? { ...r, status: updated.status as "PENDING" | "VERIFIED" | "REJECTED", editRequested: updated.editRequested } : r));
      toast.success(approved ? "Edit approved — student can now resubmit" : "Edit request denied");
    } catch { toast.error("Failed"); }
    finally { setApprovingEdit(null); }
  };

  const weeks = [...new Set(reports.map((r) => r.weekNumber))].sort((a, b) => b - a);
  const filtered = reports.filter((r) => {
    if (weekFilter !== "all" && r.weekNumber !== Number(weekFilter)) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const pending = reports.filter((r) => r.status === "PENDING").length;
  const editRequestCount = reports.filter((r) => r.editRequested).length;

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle={activeTab === "reports" ? `Weekly self-reports${pending > 0 ? ` · ${pending} pending` : ""}${editRequestCount > 0 ? ` · ${editRequestCount} edit request(s)` : ""}` : `Daily events logged by students`}
        actions={
          <Button size="sm" variant="outline" onClick={fetchAll} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b">
        <button onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "reports" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Weekly Self-Reports {editRequestCount > 0 && <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">{editRequestCount}</span>}
        </button>
        <button onClick={() => setActiveTab("daily-events")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "daily-events" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Daily Events
        </button>
      </div>

      {activeTab === "daily-events" ? (
        dailyLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : dailyEvents.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">No daily events yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {dailyEvents.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to="/instructor/students/$id" params={{ id: e.student.id }} className="text-sm font-semibold hover:text-brand">{e.student.name}</Link>
                        <span className="text-xs text-muted-foreground">{e.student.track}</span>
                        {e.student.studentCode && <span className="text-[10px] font-mono text-brand bg-brand-soft px-1.5 py-0.5 rounded">{e.student.studentCode}</span>}
                      </div>
                      {e.description && <p className="text-sm mt-1 text-muted-foreground">{e.description}</p>}
                      {(e.image1 || e.image2) && (
                        <div className="flex gap-2 mt-2">
                          {e.image1 && <a href={e.image1} target="_blank" rel="noreferrer"><img src={e.image1} alt="proof 1" className="h-16 w-16 rounded-lg object-cover border hover:opacity-90" /></a>}
                          {e.image2 && <a href={e.image2} target="_blank" rel="noreferrer"><img src={e.image2} alt="proof 2" className="h-16 w-16 rounded-lg object-cover border hover:opacity-90" /></a>}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(e.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {activeTab === "reports" && (
      <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weeks</SelectItem>
            {weeks.map((w) => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">No self-reports found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const done = [r.linkedinDone && "LinkedIn", r.learningLogDone && "Learning Log", r.codingDone && "Coding", r.eventDone && "Event"].filter(Boolean) as string[];
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Link to="/instructor/students/$id" params={{ id: r.student.id }}
                        className="font-semibold text-sm hover:text-brand">{r.student.name}</Link>
                      <span className="text-xs text-muted-foreground">{r.student.track}</span>
                      {r.student.studentCode && <span className="text-[10px] font-mono text-brand bg-brand-soft px-1.5 py-0.5 rounded">{r.student.studentCode}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Week {r.weekNumber}</span>
                      <StatusBadge s={r.status} />
                      {r.status === "PENDING" && (
                        <>
                          <Button size="sm" className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white" disabled={verifying === r.id} onClick={() => handleVerify(r.id, "VERIFIED")}>
                            {verifying === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-0.5" />}Verify
                          </Button>
                          <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2" disabled={verifying === r.id} onClick={() => handleVerify(r.id, "REJECTED")}>
                            <XCircle className="h-3 w-3 mr-0.5" />Reject
                          </Button>
                        </>
                      )}
                      <Link to="/instructor/students/$id" params={{ id: r.student.id }}
                        className="text-muted-foreground hover:text-brand"><ExternalLink className="h-3.5 w-3.5" /></Link>
                    </div>
                  </div>
                  {done.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {done.map((d) => <span key={d} className="text-[10px] font-medium bg-brand-soft text-brand px-2 py-0.5 rounded-full">✓ {d}</span>)}
                    </div>
                  )}
                  <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    {r.linkedinDone && r.linkedinUrl && <a href={r.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate"><Linkedin className="h-3 w-3 shrink-0" />{r.linkedinUrl}</a>}
                    {r.learningLogDone && r.learningLogUrl && <a href={r.learningLogUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate"><BookOpen className="h-3 w-3 shrink-0" />{r.learningLogUrl}</a>}
                    {r.codingDone && r.codingUrl && <a href={r.codingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate"><Code2 className="h-3 w-3 shrink-0" />{r.codingUrl}</a>}
                    {r.eventDone && r.eventUrl && <a href={r.eventUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand truncate"><Calendar className="h-3 w-3 shrink-0" />{r.eventUrl}</a>}
                    {r.eventDone && (r.eventImage1 || r.eventImage2) && (
                      <div className="flex gap-2 mt-1.5">
                        {r.eventImage1 && <a href={r.eventImage1} target="_blank" rel="noreferrer"><img src={r.eventImage1} alt="Event photo 1" className="h-16 w-16 rounded-lg object-cover border hover:opacity-90 transition-opacity" /></a>}
                        {r.eventImage2 && <a href={r.eventImage2} target="_blank" rel="noreferrer"><img src={r.eventImage2} alt="Event photo 2" className="h-16 w-16 rounded-lg object-cover border hover:opacity-90 transition-opacity" /></a>}
                      </div>
                    )}
                    {r.notes && <p className="italic">"{r.notes}"</p>}
                    <p>Submitted {new Date(r.submittedAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    )}
    </AppShell>
  );
}
