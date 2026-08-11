import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ScanLine, LogIn, LogOut, Clock, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ParentShell } from "@/components/ParentShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/parent/scan")({
  head: () => ({ meta: [{ title: "Scan QR | Parent Portal" }] }),
  component: ParentScan,
});

interface ScanResult {
  success: boolean;
  action?: "clock_in" | "clock_out" | "already_complete";
  student?: { name: string; code: string; track: string };
  message?: string;
  durationMin?: number | null;
  error?: string;
}

function ParentScan() {
  const [scanning, setScanning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstance = useRef<{ stop: () => Promise<void> } | null>(null);

  const processCode = async (code: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      const data = await api.post<ScanResult>("/api/attendance/scan-parent", { studentCode: code.trim() });
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : "Scan failed" });
    } finally {
      setProcessing(false);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);
    if (scannerRef.current) scannerRef.current.innerHTML = "";
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("parent-qr-reader");
    scannerInstance.current = { stop: () => scanner.stop().catch(() => {}) };
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (code) => { processCode(code); },
      () => {}
    ).catch(() => {
      setScanning(false);
      setResult({ success: false, error: "Camera access denied. Please allow camera permissions in your browser." });
    });
  };

  const stopScanner = async () => {
    setStopping(true);
    try {
      await scannerInstance.current?.stop();
    } finally {
      if (scannerRef.current) scannerRef.current.innerHTML = "";
      scannerInstance.current = null;
      setScanning(false);
      setStopping(false);
      setResult(null);
    }
  };

  useEffect(() => () => { scannerInstance.current?.stop(); }, []);

  return (
    <ParentShell>
      <Link to="/parent" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-2xl font-bold mb-1">Scan Child's QR Code</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Point your phone camera at your child's printed QR code to clock them in or out.
      </p>

      {/* Camera area — fixed height to prevent layout jump */}
      <div className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted mb-4" style={{ height: 300 }}>
        <div id="parent-qr-reader" ref={scannerRef} className="w-full h-full" />
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <ScanLine className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              {stopping ? "Stopping camera…" : "Camera off — press button to scan"}
            </p>
          </div>
        )}
      </div>

      <div className="max-w-sm mx-auto">
        {!scanning ? (
          <Button onClick={startScanner} disabled={stopping} className="w-full bg-brand text-brand-foreground hover:bg-brand/90 h-14 text-base gap-2">
            <ScanLine className="h-5 w-5" />
            {stopping ? "Stopping…" : "Open Camera & Scan"}
          </Button>
        ) : (
          <Button onClick={stopScanner} disabled={stopping} variant="outline" className="w-full gap-2">
            {stopping ? <><Loader2 className="h-4 w-4 animate-spin" />Stopping…</> : "Stop Scanner"}
          </Button>
        )}

        {/* Result card */}
        {(result || processing) && (
          <div className={`mt-5 p-5 rounded-2xl border-2 transition-all ${
            !result ? "bg-muted border-muted" :
            result.action === "clock_in" ? "bg-green-50 border-green-400" :
            result.action === "clock_out" ? "bg-blue-50 border-blue-400" :
            result.action === "already_complete" ? "bg-yellow-50 border-yellow-400" :
            "bg-red-50 border-red-400"
          }`}>
            {processing ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Processing…</span>
              </div>
            ) : result?.success ? (
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                    result.action === "clock_in" ? "bg-green-100" :
                    result.action === "clock_out" ? "bg-blue-100" : "bg-yellow-100"
                  }`}>
                    {result.action === "clock_in" && <LogIn className="h-6 w-6 text-green-600" />}
                    {result.action === "clock_out" && <LogOut className="h-6 w-6 text-blue-600" />}
                    {result.action === "already_complete" && <Clock className="h-6 w-6 text-yellow-600" />}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{result.student?.name}</p>
                    <p className="text-sm text-muted-foreground">{result.student?.track} · {result.student?.code}</p>
                    <p className="text-sm font-medium mt-2">{result.message}</p>
                  </div>
                </div>
                <Button onClick={() => setResult(null)} variant="outline" className="w-full gap-2">
                  <ScanLine className="h-4 w-4" /> Scan Again
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 text-red-700 mb-4">
                  <XCircle className="h-6 w-6 shrink-0" />
                  <p className="text-sm font-medium">{result?.error ?? "Something went wrong"}</p>
                </div>
                <Button onClick={() => setResult(null)} variant="outline" className="w-full gap-2">
                  <ScanLine className="h-4 w-4" /> Try Again
                </Button>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground mt-4">
          You can only scan QR codes for students linked to your account.
        </p>
      </div>
    </ParentShell>
  );
}
