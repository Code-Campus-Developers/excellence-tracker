import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Download } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

function BulkImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>("students");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
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
        subtitle="Upload a CSV, XLS, or XLSX file to create multiple accounts at once."
        actions={
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" /> Download Template
          </Button>
        }
      />

      {/* Type selector */}
      <div className="flex rounded-xl overflow-hidden border mb-6">
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

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-3">
              Import Results
              <Badge className="bg-green-100 text-green-700 border-green-200">{result.success} created</Badge>
              {result.failed > 0 && <Badge className="bg-red-100 text-red-700 border-red-200">{result.failed} failed</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
