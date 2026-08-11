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

function BulkImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);

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
      const res = await fetch(`${BASE}/admin/bulk-import/students`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Upload failed" })) as { error?: string }; throw new Error(err.error ?? "Upload failed"); }
      const data = await res.json() as ImportResponse;
      setResult(data);
      if (data.success > 0) toast.success(`${data.success} student(s) created successfully!`);
      if (data.failed > 0) toast.error(`${data.failed} row(s) failed — see details below`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const csv = "Name,Email,Track,Phone\nJohn Doe,john@example.com,Software Engineering,+2348012345678\nJane Smith,jane@example.com,Data Analytics,+2348087654321";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "bulk-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <PageHeader
        title="Bulk Import Students"
        subtitle="Upload a CSV, XLS, or XLSX file to create multiple student accounts at once."
        actions={
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" /> Download Template
          </Button>
        }
      />

      {/* Instructions */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">File Format</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Your file must have these columns (exact names, case-insensitive):</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {["Name", "Email", "Track", "Phone (optional)"].map((c) => (
              <span key={c} className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{c}</span>
            ))}
          </div>
          <p className="mt-2">Each student will receive a <strong>randomly generated password</strong> via email and will be prompted to change it on first login. Max 200 rows per upload.</p>
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
            {uploading ? "Creating accounts..." : "Upload & Create Accounts"}
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
  );
}
