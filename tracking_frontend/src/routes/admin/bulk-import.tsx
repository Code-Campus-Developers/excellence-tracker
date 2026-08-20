import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Download, PlusCircle, Trash2, ClipboardList } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TRACKS } from "@/lib/tracking";

export const Route = createFileRoute("/admin/bulk-import")({
  head: () => ({ meta: [{ title: "Bulk Import | CodeCampus" }] }),
  component: BulkImportPage,
});

interface ImportResult {
  row: number; name: string; email: string;
  status: "success" | "failed"; error?: string;
}
interface ImportResponse {
  total: number; success: number; failed: number; results: ImportResult[];
}

type ImportType = "students" | "instructors" | "admins" | "parents";

const TYPE_CONFIG: Record<ImportType, {
  label: string;
  endpoint: string;
  columns: string[];
  template: string;
  filename: string;
  maxRows: number;
}> = {
  students: {
    label: "Students",
    endpoint: "/admin/bulk-import/students",
    columns: ["First Name", "Last Name", "Email", "Phone", "Track"],
    template: "First Name,Last Name,Email,Phone,Track\nJohn,Doe,john@example.com,08012345678,Software Engineering\nJane,Smith,jane@example.com,08087654321,Data Analytics",
    filename: "student-import-template.csv",
    maxRows: 200,
  },
  instructors: {
    label: "Instructors",
    endpoint: "/admin/bulk-import/instructors",
    columns: ["First Name", "Last Name", "Email", "Phone", "Track (optional)"],
    template: "First Name,Last Name,Email,Phone,Track\nAde,Adeyemi,ade@example.com,08011111111,Software Engineering\nChidi,Okonkwo,chidi@example.com,08022222222,",
    filename: "instructor-import-template.csv",
    maxRows: 100,
  },
  admins: {
    label: "Admins",
    endpoint: "/admin/bulk-import/admins",
    columns: ["First Name", "Last Name", "Email", "Phone"],
    template: "First Name,Last Name,Email,Phone\nSarah,Johnson,sarah@example.com,08033333333",
    filename: "admin-import-template.csv",
    maxRows: 50,
  },
  parents: {
    label: "Parents",
    endpoint: "/admin/bulk-import/parents",
    columns: ["First Name", "Last Name", "Email", "Phone"],
    template: "First Name,Last Name,Email,Phone\nEmeka,Obi,emeka@example.com,08044444444",
    filename: "parent-import-template.csv",
    maxRows: 100,
  },
};

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
function getToken() { try { const r = localStorage.getItem("excellence_auth"); return r ? (JSON.parse(r) as { token: string }).token : null; } catch { return null; } }

type ManualRow = { firstName: string; lastName: string; email: string; phone: string; track: string };
const emptyRow = (): ManualRow => ({ firstName: "", lastName: "", email: "", phone: "", track: "" });

function ManualEntryForm({ importType, onResult }: { importType: ImportType; onResult: (r: ImportResponse, usedPassword?: string) => void }) {
  const hasTrack = importType === "students" || importType === "instructors";
  const [rows, setRows] = useState<ManualRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState("CodeCampus@2026");
  const [defaultTrack, setDefaultTrack] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const update = (idx: number, field: keyof ManualRow, val: string) =>
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (idx: number) => setRows((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const filled = rows.filter((r) => r.firstName || r.lastName || r.email);
    if (filled.length === 0) { toast.error("Add at least one row"); return; }
    setSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/admin/bulk-import/${importType}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          rows: filled,
          defaultPassword: defaultPassword.trim() || undefined,
          defaultTrack: defaultTrack || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: "Failed" })) as { error?: string }; throw new Error(e.error ?? "Failed"); }
      const data = await res.json() as ImportResponse;
      onResult(data, defaultPassword.trim() || undefined);
      if (data.success > 0) { toast.success(`${data.success} account(s) created!`); setRows([emptyRow()]); }
      if (data.failed > 0) toast.error(`${data.failed} row(s) failed — see results below`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Default fields */}
      <div className={`grid gap-4 p-4 bg-muted/40 rounded-lg border ${hasTrack ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-1 max-w-sm"}`}>
        {hasTrack && importType === "students" && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Default Track <span className="text-brand">(applied to all rows)</span></label>
            <Select value={defaultTrack} onValueChange={setDefaultTrack}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a track for all students" /></SelectTrigger>
              <SelectContent>{TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Default Password <span className="text-muted-foreground font-normal">(leave blank to auto-generate)</span></label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
              placeholder="e.g. CodeCampus@2026"
              className="h-9 pr-16"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {defaultPassword && <p className="text-xs text-amber-600 mt-1">⚠ Share this password with students directly — it won't be emailed.</p>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-8">#</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">First Name *</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Last Name *</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Email *</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Phone *</th>
              {hasTrack && !(importType === "students" && defaultTrack) && <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Track {importType === "students" ? "*" : ""}</th>}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-1.5 pr-2 text-muted-foreground text-xs">{idx + 1}</td>
                <td className="py-1.5 pr-2"><Input value={row.firstName} onChange={(e) => update(idx, "firstName", e.target.value)} placeholder="John" className="h-8 text-sm" /></td>
                <td className="py-1.5 pr-2"><Input value={row.lastName} onChange={(e) => update(idx, "lastName", e.target.value)} placeholder="Doe" className="h-8 text-sm" /></td>
                <td className="py-1.5 pr-2"><Input type="email" value={row.email} onChange={(e) => update(idx, "email", e.target.value)} placeholder="john@example.com" className="h-8 text-sm" /></td>
                <td className="py-1.5 pr-2"><Input value={row.phone} onChange={(e) => update(idx, "phone", e.target.value)} placeholder="08012345678" className="h-8 text-sm" /></td>
                {hasTrack && !(importType === "students" && defaultTrack) && (
                  <td className="py-1.5 pr-2">
                    {importType === "students" ? (
                      <Select value={row.track} onValueChange={(v) => update(idx, "track", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select track" /></SelectTrigger>
                        <SelectContent>{TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input value={row.track} onChange={(e) => update(idx, "track", e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                    )}
                  </td>
                )}
                <td className="py-1.5">
                  <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive transition-colors" title="Remove row">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-2">
          <PlusCircle className="h-4 w-4" /> Add Row
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
          {submitting ? "Creating accounts..." : `Create ${rows.filter(r => r.firstName || r.email).length || rows.length} Account(s)`}
        </Button>
      </div>
    </div>
  );
}

function BulkImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>("students");
  const [mode, setMode] = useState<"csv" | "manual">("csv");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [usedPassword, setUsedPassword] = useState<string | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);

  const config = TYPE_CONFIG[importType];

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(csv|xls|xlsx)$/i)) {
      toast.error("Only CSV, XLS, or XLSX files are accepted");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
      const token = (() => { try { const r = localStorage.getItem("excellence_auth"); return r ? (JSON.parse(r) as { token: string }).token : null; } catch { return null; } })();
      const res = await fetch(`${BASE}${config.endpoint}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Upload failed" })) as { error?: string }; throw new Error(err.error ?? "Upload failed"); }
      const data = await res.json() as ImportResponse;
      setResult(data);
      if (data.success > 0) toast.success(`${data.success} ${config.label.toLowerCase()} created successfully!`);
      if (data.failed > 0) toast.error(`${data.failed} row(s) failed — see details below`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([config.template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = config.filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <PageHeader
        title="Bulk Import"
        subtitle="Upload a CSV/Excel file or manually enter users to create multiple accounts at once."
        actions={
          mode === "csv" ? (
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" /> Download Template
            </Button>
          ) : null
        }
      />

      {/* Type selector */}
      <div className="flex rounded-xl overflow-hidden border mb-4">
        {(Object.keys(TYPE_CONFIG) as ImportType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setImportType(t); setFile(null); setResult(null); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${importType === t ? "bg-brand text-brand-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            {TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden border mb-6 w-fit">
        <button onClick={() => { setMode("csv"); setResult(null); }} className={`px-5 py-2 text-sm font-medium transition-colors ${mode === "csv" ? "bg-brand text-brand-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
          <FileSpreadsheet className="h-3.5 w-3.5 inline mr-1.5" />CSV / Excel Upload
        </button>
        <button onClick={() => { setMode("manual"); setResult(null); }} className={`px-5 py-2 text-sm font-medium transition-colors ${mode === "manual" ? "bg-brand text-brand-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
          <ClipboardList className="h-3.5 w-3.5 inline mr-1.5" />Manual Entry
        </button>
      </div>

      {mode === "manual" ? (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">Manual Entry — {config.label}</CardTitle></CardHeader>
          <CardContent>
            <ManualEntryForm importType={importType} onResult={(r, pwd) => { setResult(r); setUsedPassword(pwd); }} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Instructions */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Required Columns — {config.label}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <div className="flex flex-wrap gap-2 mt-1">
                {config.columns.map((c) => (
                  <span key={c} className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{c}</span>
                ))}
              </div>
              <p className="mt-2">Each account will receive a <strong>randomly generated password</strong> via email. Max {config.maxRows} rows per upload.</p>
            </CardContent>
          </Card>

          {/* Upload area */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? "border-brand bg-brand-soft" : "border-muted-foreground/30 hover:border-brand hover:bg-brand-soft/30"}`}
              >
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                {file ? (
                  <div>
                    <p className="font-semibold text-brand">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Drop your file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xls, .xlsx</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full mt-4 bg-brand text-brand-foreground hover:bg-brand/90 gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Creating accounts..." : `Upload & Create ${config.label}`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-3">
              Results
              <Badge className="bg-green-100 text-green-700 border-green-200">{result.success} created</Badge>
              {result.failed > 0 && <Badge className="bg-red-100 text-red-700 border-red-200">{result.failed} failed</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usedPassword && result.success > 0 && (
              <div className="mx-5 my-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-amber-800">Default password used for all {result.success} account(s):</p>
                  <p className="text-sm font-mono font-bold text-amber-900 mt-0.5">{usedPassword}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 text-xs border-amber-300"
                  onClick={() => { navigator.clipboard.writeText(usedPassword); toast.success("Password copied!"); }}>
                  Copy
                </Button>
              </div>
            )}
            <div className="divide-y">
              {result.results.map((r) => (
                <div key={r.row} className="flex items-center gap-3 px-5 py-3">
                  {r.status === "success"
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {r.status === "success"
                      ? <span className="text-xs text-green-600">Account created, email sent</span>
                      : <span className="text-xs text-red-600">{r.error}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
