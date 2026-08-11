import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentShell } from "@/components/StudentShell";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/authStore";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Student } from "@/lib/tracking";

export const Route = createFileRoute("/student/id-card")({
  head: () => ({ meta: [{ title: "ID Card | CodeCampus" }] }),
  component: StudentIdCard,
});

const CARD_W = 380;

function StudentIdCard() {
  const { user, student: authStudent } = useAuth();
  const { settings } = useStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [studentRecord, setStudentRecord] = useState<Student | null>(null);

  useEffect(() => {
    api.get<{ student: Student }>("/auth/me")
      .then((d) => setStudentRecord(d.student))
      .catch(() => {});
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    // Proxy profile photo through backend to avoid CORS issues
    const photoImgs = cardRef.current.querySelectorAll("img[crossorigin]");
    const originalSrcs = [];
    for (const img of Array.from(photoImgs)) {
      originalSrcs.push(img.src);
      if (img.src && img.src.startsWith("http")) {
        try {
          const BASE = (import.meta.env.VITE_API_URL) ?? "http://localhost:4000";
          const token = (() => { try { const r = localStorage.getItem("excellence_auth"); return r ? JSON.parse(r).token : null; } catch { return null; } })();
          const res = await fetch(`${BASE}/api/upload/proxy-image?url=${encodeURIComponent(img.src)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (res.ok) { const { dataUrl } = await res.json(); img.src = dataUrl; img.removeAttribute("crossorigin"); }
        } catch { /* use original */ }
      }
    }

    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      // Capture card as high-res image
      const imgData = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: "#f5f5f5" });

      // Get actual card dimensions
      const { offsetWidth: w, offsetHeight: h } = cardRef.current;

      // Create PDF with card dimensions (in mm, using 96 dpi conversion)
      const pxToMm = (px) => px * 0.2646;
      const pdfW = pxToMm(w + 32); // +32 for padding
      const pdfH = pxToMm(h + 32);

      const pdf = new jsPDF({ orientation: pdfH > pdfW ? "portrait" : "landscape", unit: "mm", format: [pdfW, pdfH] });
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`${studentRecord?.name ?? "student"}-id-card.pdf`);
      toast.success("ID Card downloaded as PDF!");
    } catch (err) {
      toast.error("Download failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      Array.from(photoImgs).forEach((img, i) => { img.src = originalSrcs[i] ?? img.src; if (originalSrcs[i]) img.setAttribute("crossorigin", "anonymous"); });
      setDownloading(false);
    }
  };

  const name = studentRecord?.name ?? user?.name ?? "";
  const track = studentRecord?.track ?? authStudent?.track ?? "";
  const code = studentRecord?.studentCode ?? authStudent?.studentCode ?? "";
  const cohort = settings.cohort_name ?? "Cohort 1";
  const photo = user?.profilePicture;
  const avatarColor = studentRecord?.avatarColor ?? authStudent?.avatarColor ?? "#16a34a";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  // Issue + expiry dates
  const issueDate = studentRecord?.createdAt
    ? new Date(studentRecord.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : "—";
  const expiryDate = studentRecord?.createdAt
    ? (() => { const d = new Date(studentRecord!.createdAt!); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); })()
    : "—";

  const qrValue = `${code} | ${name}`;
  const cardStyle: React.CSSProperties = { width: CARD_W, fontFamily: "system-ui, sans-serif", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" };

  return (
    <StudentShell title="ID Card">
      <p className="text-sm text-muted-foreground mb-5">Your official Code Campus International student ID card.</p>

      <div ref={cardRef} style={{ display: "inline-flex", flexDirection: "column", gap: 12, background: "#f5f5f5", padding: 16, borderRadius: 16 }}>

        {/* FRONT */}
        <div style={cardStyle}>
          <div style={{ background: "#15803d", padding: "12px 16px 10px" }}>
            <div style={{ background: "#fff", borderRadius: 6, display: "inline-block", padding: "3px 8px" }}>
              <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus" style={{ height: 26, width: "auto", display: "block" }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 8, letterSpacing: 2, marginTop: 5, textTransform: "uppercase", fontWeight: 600 }}>Student Identity Card</div>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              {photo ? (
                <img src={photo} alt={name} crossOrigin="anonymous" style={{ width: 68, height: 68, borderRadius: 6, objectFit: "cover", border: "2px solid #15803d" }} />
              ) : null}
              <div className="avatar-fallback" style={{ width: 68, height: 68, borderRadius: 6, background: avatarColor, display: photo ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold", color: "#fff", border: "2px solid #15803d" }}>{initials}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{name}</div>
              <div style={{ fontSize: 10, color: "#15803d", fontWeight: 600, marginTop: 2 }}>{track}</div>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 8px" }}>
                <div><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Student ID</div><div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", fontFamily: "monospace" }}>{code}</div></div>
                <div><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Issue Date</div><div style={{ fontSize: 9, color: "#111" }}>{issueDate}</div></div>
                <div><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Expiry Date</div><div style={{ fontSize: 9, color: "#111" }}>{expiryDate}</div></div>
                <div style={{ gridColumn: "span 2" }}><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Email</div><div style={{ fontSize: 9, color: "#374151", wordBreak: "break-all" }}>{user?.email}</div></div>
              </div>
            </div>

            {/* QR Code */}
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <QRCodeSVG value={qrValue} size={62} level="M" />
              <div style={{ fontSize: 6, color: "#9ca3af" }}>Scan to verify</div>
            </div>
          </div>
          <div style={{ background: "#f0fdf4", borderTop: "1px solid #bbf7d0", padding: "6px 16px", display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 7, color: "#15803d", letterSpacing: 1, fontWeight: 700 }}>CODE CAMPUS INTERNATIONAL</div>
            <div style={{ fontSize: 7, color: "#9ca3af" }}>codecampus.ng</div>
          </div>
        </div>

        {/* BACK */}
        <div style={cardStyle}>
          <div style={{ background: "#15803d", height: 16 }} />
          <div style={{ background: "#1a1a1a", height: 30 }} />
          <div style={{ padding: "12px 16px" }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, display: "inline-block", padding: "3px 8px" }}>
                <img src="/Code%20CampusLogo%20(1).png" alt="Code Campus" style={{ height: 22, width: "auto", display: "block" }} />
              </div>
            </div>
            <div style={{ fontSize: 8, color: "#374151", textAlign: "center", lineHeight: 1.7 }}>
              This card is the property of<br />
              <strong style={{ color: "#15803d" }}>Code Campus International</strong>.<br />
              If found, please return to:<br />
              <span style={{ fontSize: 7.5 }}>DBM Plaza, Suite 207, Aminu Kano Crescent, Wuse 2.</span>
            </div>
            <div style={{ marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
              <div><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Student ID</div><div style={{ fontSize: 9, fontWeight: 700, color: "#15803d", fontFamily: "monospace" }}>{code}</div></div>
            </div>
          </div>
          <div style={{ background: "#15803d", height: 16 }} />
        </div>
      </div>

      <div style={{ width: CARD_W + 32, marginTop: 10 }}>
        <Button onClick={handleDownload} disabled={downloading} className="w-full bg-brand text-brand-foreground hover:bg-brand/90 gap-2 h-9 text-sm">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? "Generating..." : "Download as PDF"}
        </Button>
      </div>
    </StudentShell>
  );
}
