import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/instructor/id-card")({
  head: () => ({ meta: [{ title: "ID Card | CodeCampus" }] }),
  component: InstructorIdCard,
});

const CARD_W = 380;

function InstructorIdCard() {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    const photoImgs = cardRef.current.querySelectorAll<HTMLImageElement>("img[crossorigin]");
    const originalSrcs: string[] = [];
    for (const img of Array.from(photoImgs)) {
      originalSrcs.push(img.src);
      if (img.src && img.src.startsWith("http")) {
        try {
          const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
          const token = (() => { try { const r = localStorage.getItem("excellence_auth"); return r ? (JSON.parse(r) as { token: string }).token : null; } catch { return null; } })();
          const res = await fetch(`${BASE}/api/upload/proxy-image?url=${encodeURIComponent(img.src)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (res.ok) { const { dataUrl } = await res.json() as { dataUrl: string }; img.src = dataUrl; img.removeAttribute("crossorigin"); }
        } catch { /* use original */ }
      }
    }

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: false, backgroundColor: "#f5f5f5", logging: false, allowTaint: true });
      const link = document.createElement("a");
      link.download = `${user?.name ?? "instructor"}-id-card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("ID Card downloaded!");
    } catch (err) {
      toast.error("Download failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      Array.from(photoImgs).forEach((img, i) => { img.src = originalSrcs[i] ?? img.src; if (originalSrcs[i]) img.setAttribute("crossorigin", "anonymous"); });
      setDownloading(false);
    }
  };

  const name = user?.name ?? "";
  const track = user?.track ?? "";
  const photo = user?.profilePicture;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const cardStyle: React.CSSProperties = { width: CARD_W, fontFamily: "system-ui, sans-serif", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-2">ID Card</h1>
      <p className="text-sm text-muted-foreground mb-5">Your official Code Campus International instructor ID card.</p>

      <div ref={cardRef} style={{ display: "inline-flex", flexDirection: "column", gap: 12, background: "#f5f5f5", padding: 16, borderRadius: 16 }}>

        {/* FRONT */}
        <div style={cardStyle}>
          <div style={{ background: "#15803d", padding: "12px 16px 10px" }}>
            <div style={{ background: "#fff", borderRadius: 6, display: "inline-block", padding: "3px 8px" }}>
              <img src="/image-1785130765553.png" alt="Code Campus" style={{ height: 26, width: "auto", display: "block" }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 8, letterSpacing: 2, marginTop: 5, textTransform: "uppercase", fontWeight: 600 }}>Instructor Identity Card</div>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              {photo ? (
                <img src={photo} alt={name} crossOrigin="anonymous" style={{ width: 68, height: 68, borderRadius: 6, objectFit: "cover", border: "2px solid #15803d" }} />
              ) : null}
              <div className="avatar-fallback" style={{ width: 68, height: 68, borderRadius: 6, background: "#15803d", display: photo ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold", color: "#fff", border: "2px solid #15803d" }}>{initials}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{name}</div>
              {track && <div style={{ fontSize: 10, color: "#15803d", fontWeight: 600, marginTop: 2 }}>{track}</div>}
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 8px" }}>
                <div><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Role</div><div style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Instructor</div></div>
                <div><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Specialty</div><div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>{track || "—"}</div></div>
                <div style={{ gridColumn: "span 2" }}><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Email</div><div style={{ fontSize: 9, color: "#374151", wordBreak: "break-all" }}>{user?.email}</div></div>
              </div>
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
                <img src="/image-1785130765553.png" alt="Code Campus" style={{ height: 22, width: "auto", display: "block" }} />
              </div>
            </div>
            <div style={{ fontSize: 8, color: "#374151", textAlign: "center", lineHeight: 1.7 }}>
              This card is the property of<br />
              <strong style={{ color: "#15803d" }}>Code Campus International</strong>.<br />
              If found, please return to the nearest Code Campus office.
            </div>
            <div style={{ marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
              <div><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Role</div><div style={{ fontSize: 9, fontWeight: 700, color: "#15803d" }}>Instructor</div></div>
              <div><div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Specialty</div><div style={{ fontSize: 9, fontWeight: 600, color: "#111" }}>{track || "—"}</div></div>
            </div>
            <div style={{ marginTop: 10, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
              <div style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Authorised Signature</div>
              <div style={{ borderTop: "1px solid #374151", width: "55%" }} />
            </div>
          </div>
          <div style={{ background: "#15803d", height: 16 }} />
        </div>
      </div>

      <div style={{ width: CARD_W + 32, marginTop: 10 }}>
        <Button onClick={handleDownload} disabled={downloading} className="w-full bg-brand text-brand-foreground hover:bg-brand/90 gap-2 h-9 text-sm">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? "Generating..." : "Download ID Card"}
        </Button>
      </div>
    </AppShell>
  );
}
