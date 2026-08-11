import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Users, TrendingUp, CalendarCheck, ClipboardList,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, QrCode, Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParentShell } from "@/components/ParentShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/parent/")({
  head: () => ({ meta: [{ title: "Parent Portal | CodeCampus" }] }),
  component: ParentDashboard,
});

interface Child {
  id: string; name: string; studentCode: string; track: string;
  avatarColor: string; profilePicture: string | null;
  latestEval: { week: number; total: number } | null;
  attendanceCount: number; reportCount: number;
}
interface Evaluation { id: string; week: number; evaluator: string; scores: Record<string, number>; total: number; notes: string; createdAt: string; }
interface AttRecord { id: string; date: string; clockInAt: string; clockOutAt: string | null; durationMin: number | null; }
interface Report { id: string; weekNumber: number; cohortYear: number; linkedinDone: boolean; linkedinUrl: string | null; learningLogDone: boolean; learningLogUrl: string | null; codingDone: boolean; codingUrl: string | null; status: "PENDING" | "VERIFIED" | "REJECTED"; submittedAt: string; }

function fmt(dt: string | null) { if (!dt) return "—"; return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(dt: string) { return new Date(dt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
function scoreColor(t: number) { return t >= 80 ? "text-green-600" : t >= 60 ? "text-yellow-600" : "text-red-500"; }
function ScoreBadge({ total }: { total: number }) {
  const cls = total >= 80 ? "bg-green-100 text-green-700" : total >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{total}/100</span>;
}
function StatusBadge({ status }: { status: Report["status"] }) {
  const map = { VERIFIED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-600", PENDING: "bg-yellow-100 text-yellow-700" };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>{status}</span>;
}

function ChildDetail({ childId, childName, studentCode }: { childId: string; childName: string; studentCode: string }) {
  const [tab, setTab] = useState<"progress" | "attendance" | "reports" | "qrcode">("progress");
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [attendance, setAttendance] = useState<AttRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownloadQR = async () => {
    if (!qrRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      const dataUrl = await toPng(qrRef.current, { pixelRatio: 4, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = 100;
      const imgHeight = (imgProps.height / imgProps.width) * imgWidth;
      pdf.addImage(dataUrl, "PNG", (pageWidth - imgWidth) / 2, (pageHeight - imgHeight) / 2, imgWidth, imgHeight);
      pdf.save(`${childName}-qr-code.pdf`);
    } catch { /* silent */ } finally { setDownloading(false); }
  };

  const load = useCallback((t: typeof tab) => {
    if (loaded.has(t)) return;
    setLoading(true);
    const map: Record<string, string> = { progress: `/api/parent/child/${childId}/evaluations`, attendance: `/api/parent/child/${childId}/attendance`, reports: `/api/parent/child/${childId}/reports` };
    if (!map[t]) { setLoading(false); return; }
    api.get<Evaluation[] | AttRecord[] | Report[]>(map[t])
      .then((d) => {
        if (t === "progress") setEvals(d as Evaluation[]);
        else if (t === "attendance") setAttendance(d as AttRecord[]);
        else setReports(d as Report[]);
        setLoaded((prev) => new Set([...prev, t]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [childId, loaded]);

  useEffect(() => { load("progress"); }, []);

  const TABS = [
    { key: "progress" as const, label: "Progress", icon: TrendingUp },
    { key: "attendance" as const, label: "Attendance", icon: CalendarCheck },
    { key: "reports" as const, label: "Reports", icon: ClipboardList },
    { key: "qrcode" as const, label: "QR Code", icon: QrCode },
  ];

  return (
    <div className="border-t mt-4 pt-4">
      <div className="flex gap-1 mb-4 border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); load(key); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : tab === "progress" ? (
        <div className="space-y-3">
          {evals.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No evaluations yet</p> : evals.map((e) => (
            <div key={e.id} className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3"><span className="font-medium text-sm">Week {e.week}</span><ScoreBadge total={e.total} /></div>
              {Object.entries(e.scores as Record<string, number>).map(([cat, score]) => (
                <div key={cat} className="flex items-center gap-2 text-xs mb-1.5">
                  <span className="w-32 text-muted-foreground truncate">{cat}</span>
                  <div className="flex-1 bg-muted rounded-full h-1.5"><div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.min(100, (score / 20) * 100)}%` }} /></div>
                  <span className="w-6 text-right font-medium">{score}</span>
                </div>
              ))}
              {e.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">📝 {e.notes}</p>}
            </div>
          ))}
        </div>
      ) : tab === "attendance" ? (
        <div className="space-y-2">
          {attendance.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No attendance records</p> : attendance.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium">{fmtDate(r.date)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">In: {fmt(r.clockInAt)} · Out: {fmt(r.clockOutAt)}{r.durationMin ? ` · ${Math.floor(r.durationMin / 60)}h ${r.durationMin % 60}m` : ""}</p>
              </div>
              {r.clockOutAt ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> : <Clock className="h-5 w-5 text-yellow-500 shrink-0" />}
            </div>
          ))}
        </div>
      ) : tab === "reports" ? (
        <div className="space-y-3">
          {reports.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No reports yet</p> : reports.map((r) => {
            const tasks = [
              { label: "LinkedIn Post", done: r.linkedinDone, url: r.linkedinUrl },
              { label: "Learning Log", done: r.learningLogDone, url: r.learningLogUrl },
              { label: "Coding Project", done: r.codingDone, url: r.codingUrl },
            ];
            return (
              <div key={r.id} className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3"><span className="font-medium text-sm">Week {r.weekNumber} · {r.cohortYear}</span><StatusBadge status={r.status} /></div>
                {tasks.map(({ label, done, url }) => (
                  <div key={label} className="flex items-center gap-2 text-xs mb-1.5">
                    {done ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className={done ? "" : "text-muted-foreground"}>{label}</span>
                    {done && url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline ml-auto text-xs">View</a>}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">Submitted {fmtDate(r.submittedAt)}</p>
              </div>
            );
          })}
        </div>
      ) : tab === "qrcode" ? (
        <div className="flex flex-col items-center py-4">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            This is {childName.split(" ")[0]}'s QR code for clocking in and out at the facility.
          </p>
          <div ref={qrRef} className="bg-white rounded-2xl overflow-hidden shadow-xl border" style={{ fontFamily: "system-ui" }}>
            <div style={{ background: "#15803d", padding: "16px 20px 12px" }}>
              <div style={{ background: "#fff", borderRadius: 6, display: "inline-block", padding: "4px 10px" }}>
                <img src="/image-1785130765553.png" alt="Code Campus" className="h-16 w-auto" style={{ mixBlendMode: "multiply" }} />
              </div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 9, letterSpacing: 2, marginTop: 6, textTransform: "uppercase", fontWeight: 600 }}>
                Student Access QR Code
              </div>
            </div>
            <div className="flex flex-col items-center px-8 py-6">
              <QRCodeSVG
                value={studentCode}
                size={180}
                level="H"
                includeMargin={false}
                style={{ border: "4px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#fff" }}
              />
              <div className="mt-4 text-center">
                <p className="font-bold text-lg">{childName}</p>
                <p className="text-xs font-mono text-brand mt-1 bg-brand-soft px-3 py-1 rounded-full">{studentCode}</p>
              </div>
            </div>
            <div style={{ background: "#f0fdf4", borderTop: "1px solid #bbf7d0", padding: "8px 20px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 8, color: "#15803d", fontWeight: 700, letterSpacing: 1 }}>CODE CAMPUS INTERNATIONAL</span>
              <span style={{ fontSize: 8, color: "#9ca3af" }}>codecampus.ng</span>
            </div>
          </div>
          <Button onClick={handleDownloadQR} disabled={downloading} className="w-full mt-4 bg-brand text-brand-foreground hover:bg-brand/90 gap-2">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? "Generating PDF…" : "Download QR Code as PDF"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Child[]>("/api/parent/children")
      .then((d) => {
        const list = d ?? [];
        setChildren(list);
        if (list.length === 1) setExpandedId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ParentShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user?.name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor your child's performance at Code Campus</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="text-destructive py-8 text-center">{error}</p>
      ) : children.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No children linked to your account yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Contact the Code Campus admin team to link your child's profile.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {children.map((child) => {
            const initials = child.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            const isOpen = expandedId === child.id;
            return (
              <Card key={child.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 cursor-pointer select-none" onClick={() => setExpandedId(isOpen ? null : child.id)}>
                    <div className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden" style={{ backgroundColor: child.avatarColor }}>
                      {child.profilePicture ? <img src={child.profilePicture} alt={child.name} className="h-full w-full object-cover" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-base">{child.name}</p>
                          <p className="text-xs text-muted-foreground">{child.studentCode} · {child.track}</p>
                        </div>
                        {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />}
                      </div>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          {child.latestEval ? <span>Week {child.latestEval.week}: <span className={`font-semibold ${scoreColor(child.latestEval.total)}`}>{child.latestEval.total}/100</span></span> : <span className="text-muted-foreground">No evaluations</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarCheck className="h-4 w-4" />{child.attendanceCount} day{child.attendanceCount !== 1 ? "s" : ""}</div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4" />{child.reportCount} report{child.reportCount !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  </div>
                  {isOpen && <ChildDetail childId={child.id} childName={child.name} studentCode={child.studentCode} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ParentShell>
  );
}
