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
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("scanner_key") ?? "");
  const [keySaved, setKeySaved] = useState(!!sessionStorage.getItem("scanner_key"));
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstance = useRef<{ stop: () => void } | null>(null);

  const saveKey = () => {
    sessionStorage.setItem("scanner_key", apiKey);
    setKeySaved(true);
  };

  const processCode = async (code: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ studentCode: code }),
      });
      const data: ScanResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setProcessing(false);
      // Auto-clear after 4s and resume scanning
      setTimeout(() => setResult(null), 4000);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);
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

  const stopScanner = () => {
    scannerInstance.current?.stop();
    setScanning(false);
    setResult(null);
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
          <img src="/image-1785130765553.png" alt="Code Campus" className="h-12 w-auto mx-auto mb-3" style={{ mixBlendMode: "multiply", filter: "brightness(0) invert(1)" }} />
          <h1 className="text-white text-xl font-bold">QR Attendance Scanner</h1>
          <p className="text-gray-400 text-sm mt-1">Point camera at student's QR code</p>
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
            <div
              id="qr-reader"
              ref={scannerRef}
              className="w-full rounded-xl overflow-hidden bg-gray-900 mb-4"
              style={{ minHeight: scanning ? 300 : 0 }}
            />

            {!scanning ? (
              <Button onClick={startScanner} className="w-full bg-green-600 hover:bg-green-700 h-14 text-base gap-2">
                <ScanLine className="h-5 w-5" />
                Start Camera Scanner
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="outline" className="w-full border-gray-600 text-white bg-gray-800 hover:bg-gray-700 gap-2">
                Stop Scanner
              </Button>
            )}

            {/* Result */}
            {result && (
              <div className={`mt-4 p-4 rounded-xl border ${resultColor}`}>
                {processing ? (
                  <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /><span>Processing…</span></div>
                ) : result.success ? (
                  <div className="flex items-start gap-3">
                    {result.action === "clock_in" && <LogIn className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />}
                    {result.action === "clock_out" && <LogOut className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />}
                    {result.action === "already_complete" && <Clock className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-bold text-base">{result.student?.name}</p>
                      <p className="text-sm text-muted-foreground">{result.student?.track} · {result.student?.code}</p>
                      <p className="text-sm mt-1">{result.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{result.error ?? "Failed"}</p>
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
