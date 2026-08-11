import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Download, QrCode, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParentShell } from "@/components/ParentShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/parent/qr-codes")({
  head: () => ({ meta: [{ title: "Child QR Codes | Parent Portal" }] }),
  component: ParentQRCodes,
});

interface Child {
  id: string;
  name: string;
  studentCode: string;
  track: string;
  avatarColor: string;
  profilePicture: string | null;
}

function QRCard({ child }: { child: Child }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
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
      pdf.save(`${child.name}-qr-code.pdf`);
    } catch { /* silent */ } finally { setDownloading(false); }
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={qrRef} className="bg-white rounded-2xl overflow-hidden shadow-xl border w-full max-w-xs" style={{ fontFamily: "system-ui" }}>
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
            value={child.studentCode}
            size={180}
            level="H"
            includeMargin={false}
            style={{ border: "4px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#fff" }}
          />
          <div className="mt-4 text-center">
            <p className="font-bold text-lg">{child.name}</p>
            <p className="text-sm text-muted-foreground">{child.track}</p>
            <p className="text-xs font-mono text-brand mt-1 bg-brand-soft px-3 py-1 rounded-full">{child.studentCode}</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "#f0fdf4", borderTop: "1px solid #bbf7d0", padding: "8px 20px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 8, color: "#15803d", fontWeight: 700, letterSpacing: 1 }}>CODE CAMPUS INTERNATIONAL</span>
          <span style={{ fontSize: 8, color: "#9ca3af" }}>codecampus.ng</span>
        </div>
      </div>

      <Button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full max-w-xs mt-3 bg-brand text-brand-foreground hover:bg-brand/90 gap-2"
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {downloading ? "Generating PDF…" : "Download as PDF"}
      </Button>
    </div>
  );
}

function ParentQRCodes() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Child[]>("/api/parent/children")
      .then((d) => setChildren(d ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ParentShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6 text-brand" /> QR Code
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Print and give this QR code to your child for daily attendance scanning.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
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
        <div className="space-y-10">
          {children.map((child) => (
            <QRCard key={child.id} child={child} />
          ))}
        </div>
      )}
    </ParentShell>
  );
}
