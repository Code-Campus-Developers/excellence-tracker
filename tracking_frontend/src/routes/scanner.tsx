import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ScanLine, XCircle, Clock, LogIn, LogOut, Loader2, ArrowLeft } from "lucide-react";
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

type ScanMode = "clock_in" | "clock_out";

function ScannerPage() {
  const navigate = useNavigate();
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

  const [scanMode, setScanMode] = useState<ScanMode>("clock_in");
  const scanModeRef = useRef<ScanMode>("clock_in"); // ref so camera callback always reads latest mode
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("scanner_key") ?? "");
  const [keySaved, setKeySaved] = useState(isStaffMode || !!sessionStorage.getItem("scanner_key"));
  const [scanning, setScanning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstance = useRef<{ stop: () => Promise<void> } | null>(null);
  const scanLocked = useRef(false);

  const saveKey = () => {
    sessionStorage.setItem("scanner_key", apiKey);
    setKeySaved(true);
  };

  const processCode = async (code: string) => {
    if (scanLocked.current || processing) return;
    scanLocked.current = true;
    setProcessing(true);
    try {
      const endpoint = isStaffMode ? "/api/attendance/scan-staff" : "/api/attendance/scan";
      const authHeader = isStaffMode ? `Bearer ${staffAuth}` : `Bearer ${apiKey}`;
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ studentCode: code, mode: isStaffMode ? scanModeRef.current : undefined }),
      });
      const data: ScanResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setProcessing(false);
    }
  };

  const clearResult = () => {
    scanLocked.current = false;
    setResult(null);
  };

  const startScanner = async () => {
    setScanning(true);
    setResult(null);
    scanLocked.current = false;
    if (scannerRef.current) scannerRef.current.innerHTML = "";
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerInstance.current = { stop: () => scanner.stop().catch(() => {}) };
    scanner.start(
      { facingMode: "environment" },
      {
        fps: 5,
        qrbox: (viewW: number, viewH: number) => ({ width: viewW, height: viewH }),
      },
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
      if (scannerRef.current) scannerRef.current.innerHTML = "";
      scannerInstance.current = null;
      scanLocked.current = false;
      setScanning(false);
      setStopping(false);
      setResult(null);
    }
  };

  useEffect(() => () => { scannerInstance.current?.stop(); }, []);

  const modeColor = scanMode === "clock_in" ? "bg-green-600" : "bg-blue-600";
  const resultBg =
    result?.action === "clock_in" ? "bg-green-900/90 border-green-500" :
    result?.action === "clock_out" ? "bg-blue-900/90 border-blue-500" :
    result?.action === "already_complete" ? "bg-yellow-900/90 border-yellow-500" :
    "bg-red-900/90 border-red-500";

  const resultTextColor =
    result?.action === "clock_in" ? "text-green-100" :
    result?.action === "clock_out" ? "text-blue-100" :
    result?.action === "already_complete" ? "text-yellow-100" :
    "text-red-100";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="relative text-center pt-6 pb-4 px-4">
        {isStaffMode && (
          <button
            onClick={() => {
              try {
                const raw = localStorage.getItem("excellence_auth");
                const role = raw ? JSON.parse(raw).user?.role : null;
                navigate({ to: role === "ADMIN" ? "/admin" : "/instructor" });
              } catch { navigate({ to: "/instructor" }); }
            }}
            className="absolute left-4 top-6 h-9 w-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <img
          src="/Code%20CampusLogo%20(1).png"
          alt="Code Campus"
          className="h-10 w-auto mx-auto mb-3"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <h1 className="text-white text-xl font-bold">QR Attendance Scanner</h1>
        <p className="text-gray-400 text-sm mt-1">
          {isStaffMode ? "Logged in as staff — ready to scan" : "Point camera at student's QR code"}
        </p>
      </div>

      {/* API Key setup (tablet/standalone mode) */}
      {!keySaved && (
        <div className="px-4 pb-4">
          <Card className="bg-gray-900 border-gray-700">
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
        </div>
      )}

      {keySaved && (
        <div className="flex flex-col flex-1 px-4 pb-6 gap-3">
          {/* Mode toggle — Clock In / Clock Out */}
          {isStaffMode && (
            <div className="flex rounded-xl overflow-hidden border border-gray-700">
              <button
                onClick={() => { setScanMode("clock_in"); scanModeRef.current = "clock_in"; clearResult(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${scanMode === "clock_in" ? "bg-green-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}
              >
                <LogIn className="h-4 w-4" /> Clock In
              </button>
              <button
                onClick={() => { setScanMode("clock_out"); scanModeRef.current = "clock_out"; clearResult(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${scanMode === "clock_out" ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}
              >
                <LogOut className="h-4 w-4" /> Clock Out
              </button>
            </div>
          )}

          {/* Camera — responsive square container */}
          <div
            className={`relative w-full rounded-2xl overflow-hidden border-2 ${scanMode === "clock_in" ? "border-green-700" : "border-blue-700"} bg-gray-900`}
            style={{ aspectRatio: "1 / 1", maxHeight: "70vw" }}
          >
            <div id="qr-reader" ref={scannerRef} className="w-full h-full" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <ScanLine className="h-16 w-16 text-gray-600" />
                <p className="text-gray-500 text-sm">
                  {stopping ? "Stopping camera…" : "Camera off — press Start to scan"}
                </p>
              </div>
            )}
          </div>

          {/* Start / Stop button */}
          {!scanning ? (
            <Button
              onClick={startScanner}
              disabled={stopping}
              className={`w-full h-14 text-base gap-2 ${modeColor} hover:opacity-90`}
            >
              <ScanLine className="h-5 w-5" />
              {stopping ? "Stopping…" : `Start Scanner — ${scanMode === "clock_in" ? "Clock In" : "Clock Out"}`}
            </Button>
          ) : (
            <Button
              onClick={stopScanner}
              disabled={stopping}
              variant="outline"
              className="w-full border-gray-600 text-white bg-gray-800 hover:bg-gray-700 h-12 gap-2"
            >
              {stopping
                ? <><Loader2 className="h-4 w-4 animate-spin" />Stopping…</>
                : "Stop Scanner"}
            </Button>
          )}

          {/* Result card */}
          {(result || processing) && (
            <div className={`rounded-2xl border p-5 ${result ? resultBg : "bg-gray-800 border-gray-600"}`}>
              {processing ? (
                <div className="flex items-center justify-center gap-3 py-3">
                  <Loader2 className="h-7 w-7 animate-spin text-white" />
                  <span className="text-white text-base font-medium">Processing…</span>
                </div>
              ) : result?.success ? (
                <div>
                  <div className={`flex items-start gap-4 mb-5 ${resultTextColor}`}>
                    <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      {result.action === "clock_in" && <LogIn className="h-7 w-7" />}
                      {result.action === "clock_out" && <LogOut className="h-7 w-7" />}
                      {result.action === "already_complete" && <Clock className="h-7 w-7" />}
                    </div>
                    <div>
                      <p className="font-bold text-xl">{result.student?.name}</p>
                      <p className="text-sm opacity-75 mt-0.5">{result.student?.track} · {result.student?.code}</p>
                      <p className="text-base font-semibold mt-2">{result.message}</p>
                    </div>
                  </div>
                  <Button onClick={clearResult} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 h-12 text-base font-semibold">
                    Done
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 text-red-200 mb-4">
                    <XCircle className="h-6 w-6 shrink-0" />
                    <p className="text-base font-medium">{result?.error ?? "Failed"}</p>
                  </div>
                  <Button onClick={clearResult} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 h-12 text-base font-semibold">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
