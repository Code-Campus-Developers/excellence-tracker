import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentShell } from "@/components/StudentShell";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/student/qr-code")({
  head: () => ({ meta: [{ title: "My QR Code | CodeCampus" }] }),
  component: StudentQRCode,
});

function StudentQRCode() {
  const { student, user } = useAuth();
  const qrRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const studentCode = student?.studentCode ?? "";
  const qrValue = studentCode; // QR encodes the student code only

  const handleDownload = async () => {
    if (!qrRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      const dataUrl = await toPng(qrRef.current, { pixelRatio: 4, backgroundColor: "#ffffff" });

      // Create A4 PDF and center the QR card
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = 100; // mm
      const imgHeight = (imgProps.height / imgProps.width) * imgWidth;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      pdf.addImage(dataUrl, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(`${student?.name ?? "student"}-qr-code.pdf`);
      toast.success("QR Code downloaded as PDF!");
    } catch (err) {
      toast.error("Download failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDownloading(false);
    }
  };

  if (!studentCode) {
    return (
      <StudentShell title="My QR Code">
        <Card><CardContent className="p-12 text-center text-muted-foreground">Student code not found. Please contact your instructor.</CardContent></Card>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="My QR Code">
      <div className="max-w-sm">
        <p className="text-sm text-muted-foreground mb-5">
          This is your unique Code Campus QR code. Print it and use it to clock in and out at the facility.
        </p>

        {/* QR Card */}
        <div ref={qrRef} className="bg-white rounded-2xl overflow-hidden shadow-xl border" style={{ fontFamily: "system-ui" }}>
          {/* Header */}
          <div style={{ background: "#15803d", padding: "16px 20px 12px" }}>
            <div style={{ background: "#fff", borderRadius: 6, display: "inline-block", padding: "4px 10px" }}>
              <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus" style={{ height: 28, width: "auto", display: "block" }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 9, letterSpacing: 2, marginTop: 6, textTransform: "uppercase", fontWeight: 600 }}>
              Student Access QR Code
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center px-8 py-6">
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="H"
              includeMargin={false}
              style={{ border: "4px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#fff" }}
            />
            <div className="mt-4 text-center">
              <p className="font-bold text-lg">{student?.name ?? user?.name}</p>
              <p className="text-sm text-muted-foreground">{student?.track}</p>
              <p className="text-xs font-mono text-brand mt-1 bg-brand-soft px-3 py-1 rounded-full">{studentCode}</p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: "#f0fdf4", borderTop: "1px solid #bbf7d0", padding: "8px 20px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 8, color: "#15803d", fontWeight: 700, letterSpacing: 1 }}>CODE CAMPUS INTERNATIONAL</span>
            <span style={{ fontSize: 8, color: "#9ca3af" }}>codecampus.ng</span>
          </div>
        </div>

        {/* Download */}
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full mt-4 bg-brand text-brand-foreground hover:bg-brand/90 gap-2"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? "Generating PDF…" : "Download QR Code as PDF"}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Print this and show it at the entrance every day to clock in and out automatically.
        </p>
      </div>
    </StudentShell>
  );
}
