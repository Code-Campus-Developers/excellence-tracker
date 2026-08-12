import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ScanLine, CheckCircle2, XCircle, Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/scanner")({
  head: () => ({ meta: [{ title: "QR Scanner | CodeCampus" }] }),
  component: ScannerPage,
});

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

interface ScanResult {
  success: boolean;
  action?: "clock_in" | "clock_out" | "already_complete";
  student?: { name: string; code: string; track: string };
  message?: string;
  durationMin?: number | null;
  error?: string;
}

function ScannerPage() {
  // Detect if a staff member (admin/instructor) is already logged in
  const staffAuth = (() => {
    try {
      const raw = localStorage.getItem("excellence_auth");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { token: string; user: { role: string } };
      if (parsed.user.role === "ADMIN" || parsed.user.role === "MENTOR") return parsed.token;
      return null;
    } catch { return null; }
  })();
  const isStaffMode = !!staffAuth;

  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("scanner_key") ?? "");
  const [keySaved, setKeySaved] = useState(isStaffMode || !!sessionStorage.getItem("scanner_key"));
  const [scanning, setScanning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstance = useRef<{ stop: () => Promise<void> } | null>(null);

  const saveKey = () => {
    sessionStorage.setItem("scanner_key", apiKey);
    setKeySaved(true);
  };

  const processCode = async (code: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      const endpoint = isStaffMode ? "/api/attendance/scan-staff" : "/api/attendance/scan";
      const authHeader = isStaffMode ? `Bearer ${staffAuth}` : `Bearer ${apiKey}`;
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ studentCode: code }),
      });
      const data: ScanResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setProcessing(false);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);
    // Clear any leftover html5-qrcode UI from previous session
    if (scannerRef.current) scannerRef.current.innerHTML = "";
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerInstance.current = { stop: () => scanner.stop().catch(() => {}) };
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (code) => { processCode(code.trim()); },
      () => {}
    ).catch(() => {
      setScanning(false);
      setResult({ success: false, error: "Camera access denied. Please allow camera permissions." });
    });
  };

  const stopScanner = async () => {
    setStopping(true);
    try {
      await scannerInstance.current?.stop();
    } finally {
      // Clear html5-qrcode injected DOM to prevent visual artifacts
      if (scannerRef.current) scannerRef.current.innerHTML = "";
      scannerInstance.current = null;
      setScanning(false);
      setStopping(false);
      setResult(null);
    }
  };

  useEffect(() => () => { scannerInstance.current?.stop(); }, []);

  const resultColor = result?.action === "clock_in" ? "bg-green-50 border-green-300" :
    result?.action === "clock_out" ? "bg-blue-50 border-blue-300" :
    result?.action === "already_complete" ? "bg-yellow-50 border-yellow-300" :
    "bg-red-50 border-red-300";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus" className="h-12 w-auto mx-auto mb-3" style={{ mixBlendMode: "multiply", filter: "brightness(0) invert(1)" }} />
          <h1 className="text-white text-xl font-bold">QR Attendance Scanner</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isStaffMode ? "Logged in as staff — ready to scan" : "Point camera at student's QR code"}
          </p>
        </div>

        {/* API Key setup */}
        {!keySaved && (
          <Card className="mb-4 bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <p className="text-white text-sm font-medium mb-2">Enter Scanner API Key</p>
              <Input
                type="password"
                placeholder="Paste scanner API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white mb-2"
              />
              <Button onClick={saveKey} disabled={!apiKey.trim()} className="w-full bg-green-600 hover:bg-green-700">
                Save & Start
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scanner area */}
        {keySaved && (
          <>
            {/* Scanner area — fixed height to prevent layout jump */}
            <div className="relative w-full rounded-xl overflow-hidden bg-gray-900 mb-4" style={{ height: 300 }}>
              <div
                id="qr-reader"
                ref={scannerRef}
                className="w-full h-full"
              />
              {/* Idle / stopping placeholder shown when camera is off */}
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <ScanLine className="h-12 w-12 text-gray-600" />
                  <p className="text-gray-500 text-sm">
                    {stopping ? "Stopping camera…" : "Camera off — press Start to scan"}
                  </p>
                </div>
              )}
            </div>

            {!scanning ? (
              <Button onClick={startScanner} disabled={stopping} className="w-full bg-green-600 hover:bg-green-700 h-14 text-base gap-2">
                <ScanLine className="h-5 w-5" />
                {stopping ? "Stopping…" : "Start Camera Scanner"}
              </Button>
            ) : (
              <Button onClick={stopScanner} disabled={stopping} variant="outline" className="w-full border-gray-600 text-white bg-gray-800 hover:bg-gray-700 gap-2">
                {stopping ? <><Loader2 className="h-4 w-4 animate-spin" />Stopping…</> : "Stop Scanner"}
              </Button>
            )}

            {/* Result */}
            {result && (
              <div className={`mt-4 p-4 rounded-xl border ${resultColor}`}>
                {processing ? (
                  <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /><span>Processing…</span></div>
                ) : result.success ? (
                  <div>
                    <div className="flex items-start gap-3 mb-4">
                      {result.action === "clock_in" && <LogIn className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />}
                      {result.action === "clock_out" && <LogOut className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />}
                      {result.action === "already_complete" && <Clock className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />}
                      <div>
                        <p className="font-bold text-base">{result.student?.name}</p>
                        <p className="text-sm text-muted-foreground">{result.student?.track} · {result.student?.code}</p>
                        <p className="text-sm mt-1">{result.message}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setResult(null)}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 gap-2"
                    >
                      <ScanLine className="h-4 w-4" /> Scan Next Student
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-red-700 mb-4">
                      <XCircle className="h-5 w-5 shrink-0" />
                      <p className="text-sm">{result.error ?? "Failed"}</p>
                    </div>
                    <Button
                      onClick={() => setResult(null)}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 gap-2"
                    >
                      <ScanLine className="h-4 w-4" /> Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => { setKeySaved(false); sessionStorage.removeItem("scanner_key"); stopScanner(); }}
              className="mt-4 text-xs text-gray-500 hover:text-gray-400 transition-colors w-full text-center"
            >
              Change API Key
            </button>
          </>
        )}
      </div>
    </div>
  );
}
